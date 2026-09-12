import { logger } from "@kitamersion/kita-logging";
import IndexedDB from "@/db/index";
import { IVideo } from "@/types/video";
import { IVideoTag } from "@/types/relationship";
import { ISeriesMapping } from "@/types/integrations/seriesMapping";
import { resolveAnilistProgress } from "@/utils";

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

// How long a fetched AniList progress value is trusted before we re-check.
// Long enough to avoid hammering the AniList API on every episode-add event,
// short enough to pick up manual edits made directly on AniList reasonably soon.
const MEDIA_LIST_PROGRESS_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const mediaListProgressCacheKey = (mediaId: number) => `mediaListEntryProgress:${mediaId}`;

// Mirrors src/graphql/mutation/setMediaListEntryByAnilistId.ts
const SYNC_MUTATION = `
  mutation SetMediaListEntryByAnilistId($mediaId: Int, $progress: Int, $status: MediaListStatus) {
    SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
      id
    }
  }
`;

// Mirrors src/graphql/queries/getMediaById.ts, trimmed to the single field this needs.
const MEDIA_LIST_ENTRY_PROGRESS_QUERY = `
  query GetMediaListEntryProgress($mediaId: Int) {
    Media(id: $mediaId) {
      mediaListEntry {
        progress
      }
    }
  }
`;

export const anilistRequest = async (accessToken: string, query: string, variables: Record<string, unknown>) => {
  const response = await fetch(ANILIST_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await response.json();
  if (!response.ok || body.errors) {
    throw new Error(`AniList request failed: ${JSON.stringify(body.errors ?? response.statusText)}`);
  }
  return body.data;
};

const saveMediaListEntry = async (accessToken: string, mediaId: number, progress: number, status: string): Promise<void> => {
  await anilistRequest(accessToken, SYNC_MUTATION, { mediaId, progress, status });
};

const fetchAnilistProgress = async (accessToken: string, mediaId: number): Promise<number | null> => {
  const data = await anilistRequest(accessToken, MEDIA_LIST_ENTRY_PROGRESS_QUERY, { mediaId });
  const progress = data?.Media?.mediaListEntry?.progress;
  return typeof progress === "number" ? progress : null;
};

// Resolves the episode progress AniList already knows about for this media, so a
// manually-tracked entry (e.g. the user set themselves to episode 10 on AniList
// before kita ever saw this series) isn't clobbered back down by a fresh local
// count. Cached since the value can only change via AniList itself once kita is
// the one keeping it in sync.
const getKnownAnilistProgress = async (accessToken: string, mediaId: number): Promise<number | null> => {
  const cacheKey = mediaListProgressCacheKey(mediaId);
  const cached = await IndexedDB.getAniListCache(cacheKey);
  if (typeof cached === "number") return cached;

  try {
    const progress = await fetchAnilistProgress(accessToken, mediaId);
    if (progress !== null) {
      await IndexedDB.setAniListCache(cacheKey, progress, MEDIA_LIST_PROGRESS_CACHE_TTL);
    }
    return progress;
  } catch (error) {
    logger.error(`[anilist-episode-sync] failed to fetch existing AniList progress for media ${mediaId}: ${error}`);
    return null;
  }
};

export type SyncEpisodeResult =
  | { status: "synced"; progress: number; video: IVideo; videoTag?: IVideoTag }
  | { status: "skipped"; reason: string }
  | { status: "error"; message: string };

// The single place in the codebase that reads-or-writes AniList episode progress. Every caller
// (background auto-sync, the manual search-and-link flow, pending-review resolution) funnels
// through here so a fix to the sync/reconciliation logic only has to happen once. See
// resolveAnilistProgress for why AniList's own progress - not kita's locally-captured episode
// number - is treated as the source of truth once AniList has a value.
export const syncEpisodeToAnilist = async (video: IVideo, mapping: ISeriesMapping, accessToken: string): Promise<SyncEpisodeResult> => {
  if (!mapping.anilist_series_id) return { status: "skipped", reason: "mapping has no anilist_series_id" };
  if (!video.watching_episode_number) return { status: "skipped", reason: "video has no watching_episode_number" };

  try {
    const knownAnilistProgress = await getKnownAnilistProgress(accessToken, mapping.anilist_series_id);
    const progress = resolveAnilistProgress(video.watching_episode_number, knownAnilistProgress, mapping.total_episodes);
    const status = progress === mapping.total_episodes ? "COMPLETED" : "CURRENT";

    await saveMediaListEntry(accessToken, mapping.anilist_series_id, progress, status);
    await IndexedDB.setAniListCache(mediaListProgressCacheKey(mapping.anilist_series_id), progress, MEDIA_LIST_PROGRESS_CACHE_TTL);

    const tag = await IndexedDB.getTagByCode("ANILIST");
    const updatedVideo: IVideo = {
      ...video,
      watching_episode_number: progress,
      anilist_series_id: mapping.anilist_series_id,
      mal_series_id: mapping.mal_series_id,
      series_episode_number: mapping.total_episodes,
      series_season_year: mapping.season_year,
      background_cover_image: mapping.background_cover_image || video.background_cover_image,
      banner_image: mapping.banner_image || video.banner_image,
      updated_at: Date.now(),
      tags: tag?.id ? [tag.id] : video.tags,
    };
    await IndexedDB.updateVideoById(updatedVideo);

    let videoTag: IVideoTag | undefined;
    if (tag?.id) {
      videoTag = { id: self.crypto.randomUUID(), video_id: video.id, tag_id: tag.id, created_at: Date.now() };
      await IndexedDB.addVideoTag(videoTag);
    }

    logger.info(`[anilist-episode-sync] synced "${video.series_title}" (episode ${progress}) to AniList`);
    return { status: "synced", progress, video: updatedVideo, videoTag };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[anilist-episode-sync] error syncing "${video.series_title}": ${message}`);
    return { status: "error", message };
  }
};
