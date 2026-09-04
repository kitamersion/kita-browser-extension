import { logger } from "@kitamersion/kita-logging";
import { getAnilistAuth } from "@/api/integration/anilist";
import { addPendingAnilistSync, getPendingAnilistSyncs, refreshAnilistPendingBadge } from "@/api/integration/anilistPendingSync";
import { getSourceAutoSyncConfig } from "@/api/sourceTracking";
import { seriesMappingStorage } from "@/api/seriesMapping";
import { decideAnilistAutoSyncAction, mapSiteKeyToSourcePlatform } from "@/utils";
import IndexedDB from "@/db/index";
import { IVideo } from "@/types/video";
import { ISeriesMapping, ISeriesSearchResult, SourcePlatform } from "@/types/integrations/seriesMapping";

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

// Mirrors src/graphql/queries/getMediaBySearch.ts - the background has no Apollo
// client (that only exists in popup/settings pages), so this calls AniList directly.
const SEARCH_QUERY = `
  query GetMediaBySearch($search: String, $isAdult: Boolean) {
    anime: Page(perPage: 10) {
      results: media(type: ANIME, isAdult: $isAdult, search: $search) {
        id
        idMal
        episodes
        seasonYear
        title { english native }
        coverImage { extraLarge }
        bannerImage
      }
    }
  }
`;

// Mirrors src/graphql/mutation/setMediaListEntryByAnilistId.ts
const SYNC_MUTATION = `
  mutation SetMediaListEntryByAnilistId($mediaId: Int, $progress: Int, $status: MediaListStatus) {
    SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
      id
    }
  }
`;

const anilistRequest = async (accessToken: string, query: string, variables: Record<string, unknown>) => {
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

const searchAnilist = async (accessToken: string, search: string): Promise<ISeriesSearchResult[]> => {
  const data = await anilistRequest(accessToken, SEARCH_QUERY, { search, isAdult: false });
  return (data?.anime?.results ?? []) as ISeriesSearchResult[];
};

const saveMediaListEntry = async (accessToken: string, mediaId: number, progress: number, status: string): Promise<void> => {
  await anilistRequest(accessToken, SYNC_MUTATION, { mediaId, progress, status });
};

const findPendingForSeries = (
  pending: Awaited<ReturnType<typeof getPendingAnilistSyncs>>,
  seriesTitle: string,
  sourcePlatform: SourcePlatform,
  seasonYear?: number
) =>
  pending.find(
    (entry) =>
      entry.series_title.trim().toLowerCase() === seriesTitle.trim().toLowerCase() &&
      entry.source_platform === sourcePlatform &&
      entry.season_year === seasonYear
  );

const finalizeSync = async (video: IVideo, mapping: ISeriesMapping, accessToken: string): Promise<void> => {
  if (!mapping.anilist_series_id || !video.watching_episode_number) return;

  const status = video.watching_episode_number === mapping.total_episodes ? "COMPLETED" : "CURRENT";
  await saveMediaListEntry(accessToken, mapping.anilist_series_id, video.watching_episode_number, status);

  const tag = await IndexedDB.getTagByCode("ANILIST");
  await IndexedDB.updateVideoById({
    ...video,
    anilist_series_id: mapping.anilist_series_id,
    mal_series_id: mapping.mal_series_id,
    series_episode_number: mapping.total_episodes,
    series_season_year: mapping.season_year,
    background_cover_image: mapping.background_cover_image || video.background_cover_image,
    banner_image: mapping.banner_image || video.banner_image,
    updated_at: Date.now(),
    tags: tag?.id ? [tag.id] : video.tags,
  });
  if (tag?.id) {
    await IndexedDB.addVideoTag({ id: self.crypto.randomUUID(), video_id: video.id, tag_id: tag.id, created_at: Date.now() });
  }

  logger.info(`[anilist-auto-sync] synced "${video.series_title}" (episode ${video.watching_episode_number}) to AniList`);
};

export const attemptAnilistAutoSync = async (video: IVideo): Promise<void> => {
  const sourcePlatform = mapSiteKeyToSourcePlatform(video.origin);
  if (!sourcePlatform) return;

  const seriesTitle = video.series_title;
  if (!seriesTitle) return;

  try {
    const syncConfig = await getSourceAutoSyncConfig(sourcePlatform);
    const auth = await new Promise<{ access_token: string } | null>((resolve) => getAnilistAuth(resolve));

    const existingMapping =
      (await seriesMappingStorage.findMapping(seriesTitle, sourcePlatform, video.watching_season_year, undefined, false)) ?? null;

    const pending = await getPendingAnilistSyncs();
    const pendingForSeries = findPendingForSeries(pending, seriesTitle, sourcePlatform, video.watching_season_year);

    let searchResults: ISeriesSearchResult[] | null = null;
    const needsSearch = syncConfig.enabled && !!auth?.access_token && !existingMapping && !pendingForSeries;
    if (needsSearch && auth) {
      searchResults = await searchAnilist(auth.access_token, seriesTitle);
    }

    const accessToken = auth?.access_token;
    const decision = decideAnilistAutoSyncAction({
      autoSyncEnabled: syncConfig.enabled,
      hasAuthToken: !!accessToken,
      existingMapping,
      hasPendingForSeries: !!pendingForSeries,
      searchResults,
      seasonYear: video.watching_season_year,
    });

    switch (decision.action) {
      case "skip":
        logger.debug(`[anilist-auto-sync] skipping "${seriesTitle}": ${decision.reason}`);
        return;

      case "sync": {
        if (!accessToken) return;
        await seriesMappingStorage.extendMappingTTL(decision.mapping.id);
        await finalizeSync(video, decision.mapping, accessToken);
        return;
      }

      case "createMappingAndSync": {
        if (!accessToken) return;
        const mapping = await seriesMappingStorage.createMapping({
          series_title: seriesTitle,
          source_platform: sourcePlatform,
          season_year: video.watching_season_year,
          anilist_series_id: decision.match.id,
          mal_series_id: decision.match.idMal,
          total_episodes: decision.match.episodes,
          cover_image: decision.match.coverImage?.large || decision.match.coverImage?.extraLarge,
          background_cover_image: decision.match.coverImage?.extraLarge,
          banner_image: decision.match.bannerImage,
          series_description: decision.match.description,
          user_confirmed: false,
        });
        await finalizeSync(video, mapping, accessToken);
        return;
      }

      case "queuePending":
        await addPendingAnilistSync({
          video_id: video.id,
          series_title: seriesTitle,
          source_platform: sourcePlatform,
          season_year: video.watching_season_year,
          search_results: decision.results,
        });
        logger.info(`[anilist-auto-sync] "${seriesTitle}" needs review (${decision.results.length} results)`);
        await refreshAnilistPendingBadge();
        return;
    }
  } catch (error) {
    logger.error(`[anilist-auto-sync] error syncing "${seriesTitle}": ${error}`);
  }
};
