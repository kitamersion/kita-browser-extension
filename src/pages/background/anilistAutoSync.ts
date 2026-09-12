import { logger } from "@kitamersion/kita-logging";
import { getAnilistAuth } from "@/api/integration/anilist";
import { addPendingAnilistSync, getPendingAnilistSyncs, refreshAnilistPendingBadge } from "@/api/integration/anilistPendingSync";
import { getSourceAutoSyncConfig } from "@/api/sourceTracking";
import { seriesMappingStorage } from "@/api/seriesMapping";
import { decideAnilistAutoSyncAction, mapSiteKeyToSourcePlatform } from "@/utils";
import { anilistRequest, syncEpisodeToAnilist } from "@/api/integration/anilistEpisodeSync";
import { IVideo } from "@/types/video";
import { ISeriesSearchResult, SourcePlatform } from "@/types/integrations/seriesMapping";

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

const searchAnilist = async (accessToken: string, search: string): Promise<ISeriesSearchResult[]> => {
  const data = await anilistRequest(accessToken, SEARCH_QUERY, { search, isAdult: false });
  return (data?.anime?.results ?? []) as ISeriesSearchResult[];
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
        await syncEpisodeToAnilist(video, decision.mapping, accessToken);
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
        await syncEpisodeToAnilist(video, mapping, accessToken);
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
