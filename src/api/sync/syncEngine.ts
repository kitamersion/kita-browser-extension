import { getSupabaseClient } from "./supabaseClient";
import { getSession } from "./auth";
import { dedupeByCompositeKey, reconcileByNaturalKey, remapForeignKey } from "./reconcile";
import { SyncRow } from "@/types/integrations/sync";
import IndexedDB from "@/db/index";
import { settingsManager } from "@/api/settings/manager";
import { SETTINGS } from "@/api/settings/definitions";
import { rekeyLocalDataForNewAccount } from "./rekeyLocalData";

const SAFETY_OVERLAP_MS = 5000;

// Matches `max_rows` in supabase/config.toml (and the hosted default). PostgREST silently truncates
// at this limit, so the pull has to page explicitly — a truncated first page would be lost forever
// once the cursor advanced past it.
const PAGE_SIZE = 1000;

type SyncResult = {
  status: "ok" | "no-session" | "paused" | "quota-exceeded" | "error";
  message?: string;
  rekeyed?: boolean;
  pulled?: number;
  pushed?: number;
};

const isQuotaError = (message: string | undefined) => !!message && message.toLowerCase().includes("quota");

const failureResult = (message: string, rekeyed: boolean): SyncResult =>
  isQuotaError(message) ? { status: "quota-exceeded", rekeyed } : { status: "error", message, rekeyed };

// Pull every remote row changed since the cursor, paging until a short page proves we've reached
// the end. Ordered by updated_at so `range()` walks a stable sequence across requests.
const pullTable = async (tableName: string, cursor: number): Promise<{ rows: SyncRow[]; error?: string }> => {
  const client = getSupabaseClient();
  const rows: SyncRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(tableName)
      .select("*")
      .gt("updated_at", cursor)
      .order("updated_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) return { rows: [], error: error.message };

    const page = (data ?? []) as SyncRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows };
  }
};

// Push local rows changed since the cursor. Callers pass rows that already carry canonical
// (post-reconciliation) ids, which makes this an idempotent upsert onto the row reconciliation
// picked, rather than an insert of a competing duplicate.
const pushTable = async (
  tableName: string,
  userId: string,
  cursor: number,
  localRows: SyncRow[]
): Promise<{ error?: string; count: number }> => {
  const changedLocal = localRows.filter((row) => row.updated_at > cursor);
  if (changedLocal.length === 0) return { count: 0 };

  const { error } = await getSupabaseClient()
    .from(tableName)
    .upsert(changedLocal.map((row) => ({ ...row, user_id: userId })));
  return error ? { error: error.message, count: 0 } : { count: changedLocal.length };
};

// Rewrite a row's *own* id through the reconciliation remap (remapForeignKey only rewrites a
// referenced id on other rows). Deduping afterwards keeps the push payload free of repeated primary
// keys, which Postgres rejects outright within a single upsert statement.
const canonicalizeIds = (rows: SyncRow[], idRemap: Map<string, string>): SyncRow[] => {
  if (idRemap.size === 0) return rows;
  const remapped = rows.map((row) => (idRemap.has(row.id) ? { ...row, id: idRemap.get(row.id) as string } : row));
  return dedupeByCompositeKey(remapped, (row) => row.id);
};

export const runSync = async (): Promise<SyncResult> => {
  const { userId } = await getSession();
  if (!userId) return { status: "no-session" };

  let rekeyed = false;
  try {
    const lastSyncedAccountId = await settingsManager.get(SETTINGS.kitaSync.lastSyncedAccountId);
    rekeyed = lastSyncedAccountId !== null && lastSyncedAccountId !== userId;
    if (rekeyed) {
      await rekeyLocalDataForNewAccount();
      await settingsManager.set(SETTINGS.kitaSync.pendingRekeyNotice, true);
    }
    if (lastSyncedAccountId !== userId) {
      await settingsManager.set(SETTINGS.kitaSync.lastSyncedAccountId, userId);
    }
  } catch (error) {
    // rekeyed is always false here: the atomic re-key (IndexedDB.rekeyAccountData) guarantees a
    // rejection means it did not complete, so no partial rekey occurred to report.
    return failureResult(error instanceof Error ? error.message : String(error), false);
  }

  if (await settingsManager.get(SETTINGS.kitaSync.paused)) return { status: "paused", rekeyed };

  try {
    const cursor = await IndexedDB.getLastSyncedAt();
    const syncStartedAt = Date.now();

    // includeDeleted: true — tombstoned rows must still reach the push logic below so local
    // deletions propagate to remote/other devices. The write-back step further down filters
    // tombstones back out before they're written to local storage.
    const [localTags, localVideos, localVideoTags, localAutoTags] = await Promise.all([
      IndexedDB.getAllTags(true),
      IndexedDB.getAllVideos(true),
      IndexedDB.getAllVideoTags(true),
      IndexedDB.getAllAutoTags(true),
    ]);

    // Order per table is pull -> reconcile -> push. Pushing first would upload a local row under its
    // own device-local id before reconciliation could recognise that a remote row already owns the
    // same natural key, permanently duplicating that row remotely — and those duplicates then break
    // the local write-back on the next pull, where they collide on a unique IndexedDB index.

    // ---- tags (natural key: code) ----
    const tagsPull = await pullTable("tags", cursor);
    if (tagsPull.error) return failureResult(tagsPull.error, rekeyed);
    const tagsMerge = reconcileByNaturalKey(localTags as SyncRow[], tagsPull.rows, "code");
    if (await settingsManager.get(SETTINGS.kitaSync.paused)) return { status: "paused", rekeyed };
    const tagsPush = await pushTable("tags", userId, cursor, canonicalizeIds(localTags as SyncRow[], tagsMerge.idRemap));
    if (tagsPush.error) return failureResult(tagsPush.error, rekeyed);

    // ---- videos (natural key: unique_code) ----
    const videosPull = await pullTable("videos", cursor);
    if (videosPull.error) return failureResult(videosPull.error, rekeyed);
    const videosMerge = reconcileByNaturalKey(localVideos as SyncRow[], videosPull.rows, "unique_code");
    const videosPush = await pushTable("videos", userId, cursor, canonicalizeIds(localVideos as SyncRow[], videosMerge.idRemap));
    if (videosPush.error) return failureResult(videosPush.error, rekeyed);

    // ---- auto_tags (natural key: origin) ----
    const autoTagsPull = await pullTable("auto_tags", cursor);
    if (autoTagsPull.error) return failureResult(autoTagsPull.error, rekeyed);
    const autoTagsMerge = reconcileByNaturalKey(localAutoTags as SyncRow[], autoTagsPull.rows, "origin");
    const autoTagsPush = await pushTable("auto_tags", userId, cursor, canonicalizeIds(localAutoTags as SyncRow[], autoTagsMerge.idRemap));
    if (autoTagsPush.error) return failureResult(autoTagsPush.error, rekeyed);

    // ---- video_tags (no single natural-key field; identity is the (video_id, tag_id) pair) ----
    // FKs are remapped with the tag/video remaps above before anything is pushed, so links always
    // reference canonical ids. Local duplicates of the same pair are collapsed first, then the
    // survivor is reconciled against the pulled remote rows by that same pair — otherwise an id
    // change with no remote-visible cause (a rekey, most notably) would push a second permanent
    // remote row for a link that already exists there under a different id.
    const videoTagsPull = await pullTable("video_tags", cursor);
    if (videoTagsPull.error) return failureResult(videoTagsPull.error, rekeyed);
    const remappedLocalVideoTags = remapForeignKey(
      remapForeignKey(localVideoTags as SyncRow[], "tag_id", tagsMerge.idRemap),
      "video_id",
      videosMerge.idRemap
    );
    const videoTagPairKey = (row: SyncRow) => `${row.video_id}:${row.tag_id}`;
    const dedupedLocalVideoTags = dedupeByCompositeKey(remappedLocalVideoTags, videoTagPairKey);
    const videoTagsMerge = reconcileByNaturalKey(dedupedLocalVideoTags, videoTagsPull.rows, videoTagPairKey);
    const videoTagsPush = await pushTable("video_tags", userId, cursor, canonicalizeIds(dedupedLocalVideoTags, videoTagsMerge.idRemap));
    if (videoTagsPush.error) return failureResult(videoTagsPush.error, rekeyed);

    // reconcileByNaturalKey's merge is keyed by id, so it doesn't collapse remote rows that already
    // duplicate a pair under different ids (the table has no unique constraint on the pair itself).
    // A final composite-key dedupe guards against those pre-existing duplicates surviving into the
    // local write-back.
    const mergedVideoTags = dedupeByCompositeKey(videoTagsMerge.rows, videoTagPairKey);

    await Promise.all([
      IndexedDB.replaceAllTags(tagsMerge.rows.filter((r) => !r.deleted_at) as any),
      IndexedDB.replaceAllVideos(videosMerge.rows.filter((r) => !r.deleted_at) as any),
      IndexedDB.replaceAllAutoTags(autoTagsMerge.rows.filter((r) => !r.deleted_at) as any),
      IndexedDB.replaceAllVideoTags(mergedVideoTags.filter((r) => !r.deleted_at) as any),
    ]);

    await IndexedDB.setLastSyncedAt(syncStartedAt - SAFETY_OVERLAP_MS);

    const pulled = tagsPull.rows.length + videosPull.rows.length + autoTagsPull.rows.length + videoTagsPull.rows.length;
    const pushed = tagsPush.count + videosPush.count + autoTagsPush.count + videoTagsPush.count;
    await settingsManager.set(SETTINGS.kitaSync.lastSyncStats, { pulled, pushed });

    return { status: "ok", rekeyed, pulled, pushed };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : String(error), rekeyed };
  }
};
