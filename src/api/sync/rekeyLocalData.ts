import IndexedDB from "@/db/index";
import { remapForeignKey } from "./reconcile";
import { SyncRow } from "@/types/integrations/sync";
import { IVideoTag } from "@/types/relationship";
import { IVideo } from "@/types/video";
import { ITag } from "@/types/tag";
import { IAutoTag } from "@/types/autotag";

// Mints a fresh id for every locally-synced row when this device's signed-in account changes.
// Local ids are client-generated and never scoped to "which account last synced them" — if a
// different account previously pushed from this device, those old ids already exist server-side
// under that account. RLS makes that pre-existing row invisible to a SELECT under the new
// account, so there's no way to detect the conflict in advance; a fresh id sidesteps it entirely
// by guaranteeing it never happened.
export const rekeyLocalDataForNewAccount = async (): Promise<void> => {
  const [tags, videos, videoTags, autoTags] = await Promise.all([
    IndexedDB.getAllTags(true),
    IndexedDB.getAllVideos(true),
    IndexedDB.getAllVideoTags(true),
    IndexedDB.getAllAutoTags(true),
  ]);

  const now = Date.now();
  const tagIdRemap = new Map(tags.map((tag) => [tag.id as string, self.crypto.randomUUID()]));
  const videoIdRemap = new Map(videos.map((video) => [video.id, self.crypto.randomUUID()]));

  const rekeyedTags: ITag[] = tags.map((tag) => ({ ...tag, id: tagIdRemap.get(tag.id as string) as string, updated_at: now }));
  const rekeyedVideos: IVideo[] = videos.map((video) => ({
    ...video,
    id: videoIdRemap.get(video.id) as string,
    updated_at: now,
    tags: video.tags?.map((tagId) => tagIdRemap.get(tagId) ?? tagId),
  }));

  const remappedVideoTags = remapForeignKey(
    remapForeignKey(videoTags as unknown as SyncRow[], "video_id", videoIdRemap),
    "tag_id",
    tagIdRemap
  ) as unknown as IVideoTag[];
  const rekeyedVideoTags: IVideoTag[] = remappedVideoTags.map((row) => ({
    ...row,
    id: self.crypto.randomUUID(),
    updated_at: now,
  }));

  const rekeyedAutoTags: IAutoTag[] = autoTags.map((autoTag) => ({
    ...autoTag,
    id: self.crypto.randomUUID(),
    updated_at: now,
    tags: autoTag.tags.map((tagId) => tagIdRemap.get(tagId) ?? tagId),
  }));

  await IndexedDB.rekeyAccountData(rekeyedTags, rekeyedVideos, rekeyedVideoTags, rekeyedAutoTags);
};
