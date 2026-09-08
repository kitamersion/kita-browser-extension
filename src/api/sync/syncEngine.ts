import { getSupabaseClient } from "./supabaseClient";
import { getSession } from "./auth";
import { dedupeByCompositeKey, mergeById, reconcileByNaturalKey, remapForeignKey } from "./reconcile";
import { SyncRow } from "@/types/integrations/sync";
import IndexedDB from "@/db/index";
import { settingsManager } from "@/api/settings/manager";
import { SETTINGS } from "@/api/settings/definitions";

const SAFETY_OVERLAP_MS = 5000;

// Matches `max_rows` in supabase/config.toml (and the hosted default). PostgREST silently truncates
// at this limit, so the pull has to page explicitly — a truncated first page would be lost forever
// once the cursor advanced past it.
const PAGE_SIZE = 1000;

type SyncResult = { status: "ok" | "no-session" | "paused" | "quota-exceeded" | "error"; message?: string };

const isQuotaError = (message: string | undefined) => !!message && message.toLowerCase().includes("quota");

const failureResult = (message: string): SyncResult =>
  isQuotaError(message) ? { status: "quota-exceeded" } : { status: "error", message };

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
const pushTable = async (tableName: string, userId: string, cursor: number, localRows: SyncRow[]): Promise<{ error?: string }> => {
  const changedLocal = localRows.filter((row) => row.updated_at > cursor);
  if (changedLocal.length === 0) return {};

  const { error } = await getSupabaseClient()
    .from(tableName)
    .upsert(changedLocal.map((row) => ({ ...row, user_id: userId })));
  return error ? { error: error.message } : {};
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
  if (await settingsManager.get(SETTINGS.kitaSync.paused)) return { status: "paused" };

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
    if (tagsPull.error) return failureResult(tagsPull.error);
    const tagsMerge = reconcileByNaturalKey(localTags as SyncRow[], tagsPull.rows, "code");
    if (await settingsManager.get(SETTINGS.kitaSync.paused)) return { status: "paused" };
    const tagsPush = await pushTable("tags", userId, cursor, canonicalizeIds(localTags as SyncRow[], tagsMerge.idRemap));
    if (tagsPush.error) return failureResult(tagsPush.error);

    // ---- videos (natural key: unique_code) ----
    const videosPull = await pullTable("videos", cursor);
    if (videosPull.error) return failureResult(videosPull.error);
    const videosMerge = reconcileByNaturalKey(localVideos as SyncRow[], videosPull.rows, "unique_code");
    const videosPush = await pushTable("videos", userId, cursor, canonicalizeIds(localVideos as SyncRow[], videosMerge.idRemap));
    if (videosPush.error) return failureResult(videosPush.error);

    // ---- auto_tags (natural key: origin) ----
    const autoTagsPull = await pullTable("auto_tags", cursor);
    if (autoTagsPull.error) return failureResult(autoTagsPull.error);
    const autoTagsMerge = reconcileByNaturalKey(localAutoTags as SyncRow[], autoTagsPull.rows, "origin");
    const autoTagsPush = await pushTable("auto_tags", userId, cursor, canonicalizeIds(localAutoTags as SyncRow[], autoTagsMerge.idRemap));
    if (autoTagsPush.error) return failureResult(autoTagsPush.error);

    // ---- video_tags (no natural key of its own; identity is the (video_id, tag_id) pair) ----
    // FKs are remapped with the tag/video remaps above before anything is pushed, so links always
    // reference canonical ids. The pair dedupe runs on the push payload too (not only on the final
    // merge), so two local rows describing the same link can't become two remote rows.
    const videoTagsPull = await pullTable("video_tags", cursor);
    if (videoTagsPull.error) return failureResult(videoTagsPull.error);
    const remappedLocalVideoTags = remapForeignKey(
      remapForeignKey(localVideoTags as SyncRow[], "tag_id", tagsMerge.idRemap),
      "video_id",
      videosMerge.idRemap
    );
    const videoTagsPush = await pushTable(
      "video_tags",
      userId,
      cursor,
      dedupeByCompositeKey(remappedLocalVideoTags, (row) => `${row.video_id}:${row.tag_id}`)
    );
    if (videoTagsPush.error) return failureResult(videoTagsPush.error);

    const mergedVideoTags = dedupeByCompositeKey(
      mergeById(remappedLocalVideoTags, videoTagsPull.rows),
      (row) => `${row.video_id}:${row.tag_id}`
    );

    await Promise.all([
      IndexedDB.replaceAllTags(tagsMerge.rows.filter((r) => !r.deleted_at) as any),
      IndexedDB.replaceAllVideos(videosMerge.rows.filter((r) => !r.deleted_at) as any),
      IndexedDB.replaceAllAutoTags(autoTagsMerge.rows.filter((r) => !r.deleted_at) as any),
      IndexedDB.replaceAllVideoTags(mergedVideoTags.filter((r) => !r.deleted_at) as any),
    ]);

    await IndexedDB.setLastSyncedAt(syncStartedAt - SAFETY_OVERLAP_MS);
    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : String(error) };
  }
};
