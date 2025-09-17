import LoadingState from "@/components/states/LoadingState";
import { GetMediaBySearchQuery, MediaListStatus, useGetMediaBySearchLazyQuery, useSetMediaListEntryByAnilistIdMutation } from "@/graphql";
import { IconButton } from "@chakra-ui/react";
import React, { useCallback, useEffect, useState } from "react";
import { SiAnilist } from "react-icons/si";
import eventbus from "@/api/eventbus";
import { IVideo } from "@/types/video";
import { VIDEO_TAG_ADD_RELATIONSHIP, VIDEO_UPDATED_BY_ID } from "@/data/events";
import { useToastContext } from "@/context/toastNotificationContext";
import IndexedDB from "@/db/index";
import { IVideoTag } from "@/types/relationship";
import logger from "@/config/logger";
import { useAnilistContext } from "@/context/anilistContext";
import { seriesMappingStorage } from "@/api/seriesMapping";
import { ISeriesMapping, ISeriesSearchResult, SourcePlatform } from "@/types/integrations/seriesMapping";
import SeriesMappingSelection from "@/components/SeriesMappingSelection";

const AnilistAnimeTrySearchAndLink = (video: IVideo) => {
  const { showToast } = useToastContext();
  const { isInitialized: isAnilistReady, anilistAutoSyncMedia } = useAnilistContext();

  const [getMediaBySearch, { data: searchData, loading: isSearching, error: searchError }] = useGetMediaBySearchLazyQuery();
  const [setMedia, { loading: isUpdatingList, error: updateError }] = useSetMediaListEntryByAnilistIdMutation();

  const [isSynced, setIsSynced] = useState(!!video.anilist_series_id);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [seriesMapping, setSeriesMapping] = useState<ISeriesMapping | undefined>();
  const [showMappingSelection, setShowMappingSelection] = useState(false);

  // Detect source platform from video origin or URL
  const getSourcePlatform = useCallback((): SourcePlatform => {
    // Use the origin field first, then fallback to URL checking
    if (video.origin === "CRUNCHYROLL") return "crunchyroll";
    if (video.origin === "YOUTUBE") return "youtube";

    // Fallback to URL checking for other platforms
    if (video.video_url?.includes("netflix")) return "netflix";
    if (video.video_url?.includes("hidive")) return "hidive";
    if (video.video_url?.includes("funimation")) return "funimation";
    if (video.video_url?.includes("hulu")) return "hulu";

    return "crunchyroll"; // Default fallback
  }, [video.origin, video.video_url]);

  // Find existing series mapping
  const findExistingMapping = useCallback(async (): Promise<ISeriesMapping | undefined> => {
    const sourcePlatform = getSourcePlatform();
    const mapping = await seriesMappingStorage.findMapping(video.series_title || "", sourcePlatform, video.watching_season_year);
    return mapping;
  }, [getSourcePlatform, video.series_title, video.watching_season_year]);

  const searchAnimeInAnilist = useCallback(async () => {
    // First, check if we have a series mapping
    const existingMapping = await findExistingMapping();
    if (existingMapping?.anilist_series_id) {
      logger.info("Using existing series mapping for sync");
      setSeriesMapping(existingMapping);

      // Extend TTL since mapping is being used
      await seriesMappingStorage.extendMappingTTL(existingMapping.id);
      return;
    }

    // No mapping found, search AniList
    logger.info("No series mapping found, searching AniList");
    getMediaBySearch({ variables: { search: video.series_title, isAdult: false } });
  }, [findExistingMapping, getMediaBySearch, video.series_title]);

  // Modal handling functions
  const convertSearchResultsForModal = useCallback((searchResults?: GetMediaBySearchQuery): ISeriesSearchResult[] => {
    if (!searchResults?.anime?.results) return [];

    return searchResults.anime.results.map((result) => ({
      id: result?.id || 0,
      title: {
        english: result?.title?.english || undefined,
        romaji: undefined, // Not available in this query
        native: result?.title?.native || undefined,
      },
      seasonYear: result?.seasonYear || undefined,
      episodes: result?.episodes || undefined,
      coverImage: {
        large: undefined, // Not available in this query
        extraLarge: result?.coverImage?.extraLarge || undefined,
      },
      bannerImage: result?.bannerImage || undefined,
      description: undefined, // Not available in this query
      idMal: result?.idMal || undefined,
    }));
  }, []);

  const handleMappingSelection = useCallback(
    async (selectedResult: ISeriesSearchResult) => {
      const sourcePlatform = getSourcePlatform();

      // Create the series mapping
      const mapping = await seriesMappingStorage.createMapping({
        series_title: video.series_title || "",
        source_platform: sourcePlatform,
        season_year: video.watching_season_year,
        anilist_series_id: selectedResult.id,
        mal_series_id: selectedResult.idMal,
        total_episodes: selectedResult.episodes,
        cover_image: selectedResult.coverImage?.large,
        background_cover_image: selectedResult.coverImage?.extraLarge,
        banner_image: selectedResult.bannerImage,
        series_description: selectedResult.description,
        user_confirmed: true,
      });

      setSeriesMapping(mapping);

      logger.info(`Created series mapping: ${video.series_title} -> ${selectedResult.title.english || selectedResult.title.romaji}`);

      showToast({
        title: "Series mapping saved!",
        description: `${video.series_title} will now sync with ${selectedResult.title.english || selectedResult.title.romaji}`,
        status: "success",
        duration: 4000,
      });
    },
    [getSourcePlatform, video.series_title, video.watching_season_year, showToast]
  );

  // Effect to handle search results and show modal when needed
  useEffect(() => {
    if (searchData?.anime?.results && searchData.anime.results.length > 0) {
      // Try automatic matching first
      const autoMatch = searchData.anime.results.find((result) => result?.seasonYear === video.watching_season_year);

      if (autoMatch) {
        // Auto-match found, let the findMapping API handle creating the mapping
        logger.info("Auto-match found, using findMapping to handle mapping creation");

        const sourcePlatform = getSourcePlatform();

        // Use findMapping which will auto-create if needed
        seriesMappingStorage
          .findMapping(video.series_title || "", sourcePlatform, video.watching_season_year, autoMatch.id || 0, true)
          .then((mapping) => {
            if (mapping) {
              setSeriesMapping(mapping);
              logger.info(`Using/created mapping: ${video.series_title} -> ${autoMatch.id}`);
            }
          })
          .catch(() => {
            logger.error("Failed to find/create auto-mapping");
          });
      } else if (searchData.anime.results.length > 1) {
        // Multiple results but no auto-match, show modal for user selection
        logger.info("Multiple results found, showing selection modal");
        setShowMappingSelection(true);
      } else if (searchData.anime.results.length === 1) {
        // Single result but doesn't match season, show modal to confirm
        logger.info("Single result found, showing confirmation modal");
        setShowMappingSelection(true);
      } else {
        // No results found
        logger.warn("No search results found");
        showToast({
          title: "No results found on AniList",
          description: `Could not find any matching anime for "${video.series_title}"`,
          status: "error",
        });
      }
    }
  }, [searchData, video.watching_season_year, video.series_title, getSourcePlatform, showToast]);

  const fetchAndSyncAnilist = useCallback(
    async (searchData?: GetMediaBySearchQuery) => {
      const tag = await IndexedDB.getTagByCode("ANILIST");

      // Use series mapping data directly for sync, or search data as fallback
      let anilistSeriesId: number | undefined;
      let malSeriesId: number | undefined;
      let seriesEpisodeNumber: number | undefined;
      let seriesSeasonYear: number | undefined;
      let backgroundCoverImage: string | undefined;
      let bannerImage: string | undefined;

      if (seriesMapping) {
        // Use series mapping data
        anilistSeriesId = seriesMapping.anilist_series_id;
        malSeriesId = seriesMapping.mal_series_id;
        seriesEpisodeNumber = seriesMapping.total_episodes;
        seriesSeasonYear = seriesMapping.season_year;
        backgroundCoverImage = seriesMapping.background_cover_image;
        bannerImage = seriesMapping.banner_image;

        // Check if images are missing and try to fill them from search data
        if ((!backgroundCoverImage || !bannerImage) && searchData?.anime?.results) {
          const matchingAnime = searchData.anime.results.find((result) => result?.id === anilistSeriesId);
          if (matchingAnime) {
            if (!backgroundCoverImage) {
              backgroundCoverImage = matchingAnime.coverImage?.extraLarge || undefined;
            }
            if (!bannerImage) {
              bannerImage = matchingAnime.bannerImage || undefined;
            }

            // Update the series mapping with the new image data
            if (backgroundCoverImage || bannerImage) {
              try {
                await seriesMappingStorage.updateMapping(seriesMapping.id, {
                  background_cover_image: backgroundCoverImage,
                  banner_image: bannerImage,
                });
                logger.info(`Updated series mapping with missing image data: ${seriesMapping.series_title}`);
              } catch (error) {
                logger.error(`Failed to update series mapping with image data: ${error}`);
              }
            }
          }
        }
      } else if (searchData?.anime?.results) {
        // Fallback to search data
        const matchingAnime = searchData.anime.results.find((result) => result?.seasonYear === video.watching_season_year);
        if (matchingAnime) {
          anilistSeriesId = matchingAnime.id;
          malSeriesId = matchingAnime.idMal || undefined;
          seriesEpisodeNumber = matchingAnime.episodes || undefined;
          seriesSeasonYear = matchingAnime.seasonYear || undefined;
          backgroundCoverImage = matchingAnime.coverImage?.extraLarge || undefined;
          bannerImage = matchingAnime.bannerImage || undefined;

          // Create series mapping for future use (auto-sync)
          const sourcePlatform = getSourcePlatform();
          const mapping = await seriesMappingStorage.createMapping({
            series_title: video.series_title || "",
            source_platform: sourcePlatform,
            season_year: video.watching_season_year,
            anilist_series_id: matchingAnime.id,
            mal_series_id: matchingAnime.idMal || undefined,
            total_episodes: matchingAnime.episodes || undefined,
            cover_image: matchingAnime.coverImage?.extraLarge || undefined,
            background_cover_image: matchingAnime.coverImage?.extraLarge || undefined,
            banner_image: matchingAnime.bannerImage || undefined,
            user_confirmed: false, // Auto-created from search
          });
          setSeriesMapping(mapping);
        }
      }

      const updatedVideo: IVideo = {
        ...video,
        anilist_series_id: anilistSeriesId,
        mal_series_id: malSeriesId,
        series_episode_number: seriesEpisodeNumber,
        series_season_year: seriesSeasonYear,
        background_cover_image: backgroundCoverImage || video.background_cover_image,
        banner_image: bannerImage || video.banner_image,
        updated_at: Date.now(),
        tags: tag?.id ? [tag.id] : [],
      };

      const videoTagRelationship: IVideoTag = {
        id: self.crypto.randomUUID(),
        video_id: video.id,
        tag_id: tag?.id ?? "",
        created_at: Date.now(),
      };

      eventbus.publish(VIDEO_UPDATED_BY_ID, { message: "updating video with anilist search", value: updatedVideo });
      eventbus.publish(VIDEO_TAG_ADD_RELATIONSHIP, { message: "video tag add relationship from anilist", value: [videoTagRelationship] });

      // Check if we should sync to AniList
      if (anilistSeriesId && video.watching_episode_number && seriesEpisodeNumber) {
        if (video.watching_episode_number < seriesEpisodeNumber) {
          logger.info("Episode not complete yet, skipping AniList sync");
          showToast({
            title: "Anilist media synced!",
            status: "success",
          });
          setIsSynced(true);
          return;
        }
      }

      const mediaCompletedStatus =
        video.watching_episode_number === seriesEpisodeNumber ? MediaListStatus.Completed : MediaListStatus.Current;

      if (anilistSeriesId) {
        setMedia({
          variables: {
            mediaId: anilistSeriesId,
            status: mediaCompletedStatus,
            progress: video.watching_episode_number,
          },
        })
          .then(() => {
            showToast({
              title: "Anilist media synced!",
              status: "success",
            });
            setIsSynced(true);
          })
          .catch(() => {
            showToast({
              title: "Failed to sync to Anilist",
              status: "error",
            });
          });
      }
    },
    [seriesMapping, setMedia, showToast, video, getSourcePlatform]
  );

  useEffect(() => {
    if (isAnilistReady && anilistAutoSyncMedia && !isSynced) {
      const timeout = setTimeout(() => {
        searchAnimeInAnilist();
        setIsAutoSyncing(true);
        if ((seriesMapping || searchData) && !isSynced) {
          const timeout2 = setTimeout(() => {
            fetchAndSyncAnilist(searchData);
            setIsAutoSyncing(false);
          }, 1000);
          return () => clearTimeout(timeout2);
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [anilistAutoSyncMedia, fetchAndSyncAnilist, isAnilistReady, searchData, searchAnimeInAnilist, isSynced, seriesMapping]);

  useEffect(() => {
    if ((seriesMapping || searchData) && !isSynced) {
      setIsSynced(false);
    }
  }, [seriesMapping, searchData, isSynced]);

  useEffect(() => {
    if (updateError || searchError) {
      const errorMessage = updateError?.message || searchError?.message || "Unknown error occurred";
      showToast({ title: errorMessage, status: "error" });
    }
  }, [seriesMapping, fetchAndSyncAnilist, updateError, searchData, searchError, showToast, isSynced]);

  if (!isAnilistReady) {
    return <LoadingState />;
  }

  if (isAutoSyncing) {
    return <LoadingState />;
  }

  if (isSearching || isUpdatingList) {
    return <LoadingState />;
  }

  return (
    <>
      <SeriesMappingSelection
        isVisible={showMappingSelection}
        onSkip={() => setShowMappingSelection(false)}
        onSelect={(selectedResult) => {
          handleMappingSelection(selectedResult);
          setShowMappingSelection(false);
        }}
        searchResults={convertSearchResultsForModal(searchData)}
        seriesTitle={video.series_title || ""}
      />
      <IconButton
        icon={<SiAnilist />}
        aria-label="Sync to AniList"
        title={isSynced ? "Synced to AniList" : "Sync to AniList"}
        colorScheme={isSynced ? "green" : undefined}
        onClick={searchAnimeInAnilist}
        isLoading={isSearching}
        size="sm"
        variant="ghost"
        rounded="full"
      />
    </>
  );
};

export default AnilistAnimeTrySearchAndLink;
