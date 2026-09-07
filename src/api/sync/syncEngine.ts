import { getSupabaseClient } from "./supabaseClient";
import { getSession } from "./auth";
import { dedupeByCompositeKey, mergeById, reconcileByNaturalKey, remapForeignKey } from "./reconcile";
import { SyncRow } from "@/types/integrations/sync";
import IndexedDB from "@/db/index";

const SAFETY_OVERLAP_MS = 5000;

type SyncResult = { status: "ok" | "no-session" | "quota-exceeded" | "error"; message?: string };

const isQuotaError = (message: string | undefined) => !!message && message.toLowerCase().includes("quota");

const syncTable = async (
  tableName: string,
  userId: string,
  cursor: number,
  localRows: SyncRow[]
): Promise<{ mergedRemote: SyncRow[]; pushError?: string }> => {
  const client = getSupabaseClient();

  const changedLocal = localRows.filter((row) => row.updated_at > cursor);
  if (changedLocal.length > 0) {
    const { error } = await client.from(tableName).upsert(changedLocal.map((row) => ({ ...row, user_id: userId })));
    if (error) return { mergedRemote: [], pushError: error.message };
  }

  const { data, error: pullError } = await client.from(tableName).select("*").gt("updated_at", cursor);
  if (pullError) return { mergedRemote: [], pushError: pullError.message };

  return { mergedRemote: (data ?? []) as SyncRow[] };
};

export const runSync = async (): Promise<SyncResult> => {
  const { userId } = await getSession();
  if (!userId) return { status: "no-session" };

  const cursor = await IndexedDB.getLastSyncedAt();
  const syncStartedAt = Date.now();

  const [localTags, localVideos, localVideoTags, localAutoTags] = await Promise.all([
    IndexedDB.getAllTags(),
    IndexedDB.getAllVideos(),
    IndexedDB.getAllVideoTags(),
    IndexedDB.getAllAutoTags(),
  ]);

  const tagsResult = await syncTable("tags", userId, cursor, localTags as SyncRow[]);
  if (tagsResult.pushError) {
    return isQuotaError(tagsResult.pushError) ? { status: "quota-exceeded" } : { status: "error", message: tagsResult.pushError };
  }
  const tagsMerge = reconcileByNaturalKey(localTags as SyncRow[], tagsResult.mergedRemote, "code");

  const videosResult = await syncTable("videos", userId, cursor, localVideos as SyncRow[]);
  if (videosResult.pushError) {
    return isQuotaError(videosResult.pushError) ? { status: "quota-exceeded" } : { status: "error", message: videosResult.pushError };
  }
  const videosMerge = reconcileByNaturalKey(localVideos as SyncRow[], videosResult.mergedRemote, "unique_code");

  const autoTagsResult = await syncTable("auto_tags", userId, cursor, localAutoTags as SyncRow[]);
  if (autoTagsResult.pushError) {
    return isQuotaError(autoTagsResult.pushError)
      ? { status: "quota-exceeded" }
      : { status: "error", message: autoTagsResult.pushError };
  }
  const autoTagsMerge = reconcileByNaturalKey(localAutoTags as SyncRow[], autoTagsResult.mergedRemote, "origin");

  const remappedLocalVideoTags = remapForeignKey(
    remapForeignKey(localVideoTags as SyncRow[], "tag_id", tagsMerge.idRemap),
    "video_id",
    videosMerge.idRemap
  );
  const videoTagsResult = await syncTable("video_tags", userId, cursor, remappedLocalVideoTags);
  if (videoTagsResult.pushError) {
    return isQuotaError(videoTagsResult.pushError)
      ? { status: "quota-exceeded" }
      : { status: "error", message: videoTagsResult.pushError };
  }
  const mergedVideoTags = dedupeByCompositeKey(
    mergeById(remappedLocalVideoTags, videoTagsResult.mergedRemote),
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
};
