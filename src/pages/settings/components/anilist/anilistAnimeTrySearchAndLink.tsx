import LoadingState from "@/components/states/LoadingState";
import { MediaListStatus, useGetMediaBySearchLazyQuery, useSetMediaListEntryByAnilistIdMutation } from "@/graphql";
import { Box, Spinner } from "@chakra-ui/react";
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
  const [showMappingSelection, setShowMappingSelection] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "searching" | "mapping" | "syncing" | "complete" | "error">("idle");
  const [searchResults, setSearchResults] = useState<ISeriesSearchResult[]>([]);

  // Auto-sync effect
  useEffect(() => {
    if (isAnilistReady && anilistAutoSyncMedia && !isSynced && syncStatus === "idle") {
      const timeout = setTimeout(() => {
        startSync();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isAnilistReady, anilistAutoSyncMedia, isSynced, syncStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Error handling
  useEffect(() => {
    if (updateError || searchError) {
      const errorMessage = updateError?.message || searchError?.message || "Unknown error occurred";
      showToast({ title: errorMessage, status: "error" });
      setSyncStatus("error");
    }
  }, [updateError, searchError, showToast]);

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

  // Check for existing mapping
  const checkExistingMapping = useCallback(async (): Promise<ISeriesMapping | null> => {
    const sourcePlatform = getSourcePlatform();
    try {
      logger.info(
        `Checking existing mapping for: "${video.series_title}" (platform: ${sourcePlatform}, year: ${video.watching_season_year})`
      );

      const mapping = await seriesMappingStorage.findMapping(
        video.series_title || "",
        sourcePlatform,
        video.watching_season_year,
        undefined,
        false // Don't auto-create
      );

      if (mapping) {
        logger.info(`Found existing mapping: "${mapping.series_title}" -> AniList ID: ${mapping.anilist_series_id}`);
      } else {
        logger.info("No existing mapping found");
      }

      return mapping || null;
    } catch (error) {
      logger.error(`Error checking existing mapping: ${error}`);
      return null;
    }
  }, [getSourcePlatform, video.series_title, video.watching_season_year]);

  // Create mapping from search result
  const createMappingFromResult = useCallback(
    async (result: ISeriesSearchResult, userConfirmed = false): Promise<ISeriesMapping | null> => {
      const sourcePlatform = getSourcePlatform();
      try {
        const mapping = await seriesMappingStorage.createMapping({
          series_title: video.series_title || "",
          source_platform: sourcePlatform,
          season_year: video.watching_season_year,
          anilist_series_id: result.id,
          mal_series_id: result.idMal,
          total_episodes: result.episodes,
          cover_image: result.coverImage?.large || result.coverImage?.extraLarge,
          background_cover_image: result.coverImage?.extraLarge,
          banner_image: result.bannerImage,
          series_description: result.description,
          user_confirmed: userConfirmed,
        });

        logger.info(`Created series mapping: ${video.series_title} -> ${result.title.english || result.title.romaji}`);
        return mapping;
      } catch (error) {
        logger.error(`Error creating mapping: ${error}`);
        return null;
      }
    },
    [getSourcePlatform, video.series_title, video.watching_season_year]
  );

  // Sync to AniList using mapping data
  const syncToAnilist = useCallback(
    async (mapping: ISeriesMapping): Promise<void> => {
      if (syncStatus === "syncing") return; // Prevent duplicate syncs

      setSyncStatus("syncing");

      try {
        const tag = await IndexedDB.getTagByCode("ANILIST");

        // Update video with mapping data
        const updatedVideo: IVideo = {
          ...video,
          anilist_series_id: mapping.anilist_series_id,
          mal_series_id: mapping.mal_series_id,
          series_episode_number: mapping.total_episodes,
          series_season_year: mapping.season_year,
          background_cover_image: mapping.background_cover_image || video.background_cover_image,
          banner_image: mapping.banner_image || video.banner_image,
          updated_at: Date.now(),
          tags: tag?.id ? [tag.id] : [],
        };

        const videoTagRelationship: IVideoTag = {
          id: self.crypto.randomUUID(),
          video_id: video.id,
          tag_id: tag?.id ?? "",
          created_at: Date.now(),
        };

        // Update video in storage
        eventbus.publish(VIDEO_UPDATED_BY_ID, { message: "updating video with anilist search", value: updatedVideo });
        eventbus.publish(VIDEO_TAG_ADD_RELATIONSHIP, { message: "video tag add relationship from anilist", value: [videoTagRelationship] });

        // Sync to AniList if we have the required data
        if (mapping.anilist_series_id && video.watching_episode_number) {
          const mediaCompletedStatus =
            video.watching_episode_number === mapping.total_episodes ? MediaListStatus.Completed : MediaListStatus.Current;

          await setMedia({
            variables: {
              mediaId: mapping.anilist_series_id,
              status: mediaCompletedStatus,
              progress: video.watching_episode_number,
            },
          });

          showToast({
            title: "AniList media synced!",
            status: "success",
          });

          setIsSynced(true);
          setSyncStatus("complete");
        } else {
          setSyncStatus("complete");
        }
      } catch (error) {
        logger.error(`Error syncing to AniList: ${error}`);
        showToast({
          title: "Failed to sync to AniList",
          status: "error",
        });
        setSyncStatus("error");
      }
    },
    [video, setMedia, showToast, syncStatus]
  );

  // Main sync function - this is the entry point for all sync operations
  const startSync = useCallback(async () => {
    if (syncStatus !== "idle") return; // Prevent multiple syncs

    setSyncStatus("searching");

    try {
      // Step 1: Check for existing mapping
      const existingMapping = await checkExistingMapping();

      if (existingMapping?.anilist_series_id) {
        logger.info("Using existing series mapping");
        await seriesMappingStorage.extendMappingTTL(existingMapping.id);
        await syncToAnilist(existingMapping);
        return;
      }

      // Step 2: No existing mapping, search AniList
      logger.info("No mapping found, searching AniList");
      getMediaBySearch({ variables: { search: video.series_title, isAdult: false } });
    } catch (error) {
      logger.error(`Error starting sync: ${error}`);
      setSyncStatus("error");
    }
  }, [checkExistingMapping, getMediaBySearch, video.series_title, syncToAnilist, syncStatus]);

  // Handle user selection from modal
  const handleMappingSelection = useCallback(
    async (selectedResult: ISeriesSearchResult) => {
      setShowMappingSelection(false);
      setSyncStatus("mapping");

      const mapping = await createMappingFromResult(selectedResult, true);
      if (mapping) {
        showToast({
          title: "Series mapping saved!",
          description: `${video.series_title} will now sync with ${selectedResult.title.english || selectedResult.title.romaji}`,
          status: "success",
          duration: 4000,
        });
        await syncToAnilist(mapping);
      } else {
        setSyncStatus("error");
      }
    },
    [createMappingFromResult, showToast, video.series_title, syncToAnilist]
  );

  // Handle search results
  useEffect(() => {
    if (searchData?.anime?.results && searchData.anime.results.length > 0 && syncStatus === "searching") {
      const results: ISeriesSearchResult[] = searchData.anime.results.map((result) => ({
        id: result?.id || 0,
        title: {
          english: result?.title?.english || undefined,
          romaji: undefined,
          native: result?.title?.native || undefined,
        },
        seasonYear: result?.seasonYear || undefined,
        episodes: result?.episodes || undefined,
        coverImage: {
          large: undefined,
          extraLarge: result?.coverImage?.extraLarge || undefined,
        },
        bannerImage: result?.bannerImage || undefined,
        description: undefined,
        idMal: result?.idMal || undefined,
      }));
      setSearchResults(results);

      // Try automatic matching first
      const autoMatch = results.find((result) => result.seasonYear === video.watching_season_year);

      if (autoMatch) {
        // Auto-match found, create mapping and sync
        logger.info("Auto-match found by season year");
        setSyncStatus("mapping");

        createMappingFromResult(autoMatch, false).then(async (mapping) => {
          if (mapping) {
            await syncToAnilist(mapping);
          } else {
            setSyncStatus("error");
          }
        });
      } else if (results.length > 0) {
        // Show selection UI for any results (single or multiple)
        logger.info(`Found ${results.length} result(s), showing selection UI`);
        setShowMappingSelection(true);
        setSyncStatus("idle"); // Wait for user selection
      } else {
        // No results found
        logger.warn("No search results found");
        showToast({
          title: "No results found on AniList",
          description: `Could not find any matching anime for "${video.series_title}"`,
          status: "error",
        });
        setSyncStatus("error");
      }
    }
  }, [searchData, video.watching_season_year, video.series_title, showToast, createMappingFromResult, syncToAnilist, syncStatus]);

  if (!isAnilistReady) {
    return <LoadingState />;
  }

  if (syncStatus === "searching" || syncStatus === "mapping" || syncStatus === "syncing") {
    return <LoadingState />;
  }

  if (isSearching || isUpdatingList) {
    return (
      <Box
        bg="rgba(255, 99, 71, 0.8)"
        border="2px solid rgba(255, 99, 71, 0.9)"
        rounded="lg"
        width={8}
        height={8}
        display="flex"
        alignItems="center"
        justifyContent="center"
        backdropFilter="blur(8px)"
      >
        <Spinner thickness="2px" speed="0.65s" emptyColor="white" color="white" size="sm" />
      </Box>
    );
  }

  // If showing selection, render the selection UI
  if (showMappingSelection) {
    return (
      <SeriesMappingSelection
        isVisible={showMappingSelection}
        onSkip={() => {
          setShowMappingSelection(false);
          setSyncStatus("idle");
        }}
        onSelect={handleMappingSelection}
        searchResults={searchResults}
        seriesTitle={video.series_title || ""}
        isLoading={isSearching}
      />
    );
  }

  // Default: styled AniList button to match the card design
  return (
    <Box
      as="button"
      bg={isSynced ? "rgba(72, 187, 120, 0.8)" : "rgba(255, 99, 71, 0.8)"}
      border={`2px solid ${isSynced ? "rgba(72, 187, 120, 0.9)" : "rgba(255, 99, 71, 0.9)"}`}
      rounded="lg"
      width={8}
      height={8}
      display="flex"
      alignItems="center"
      justifyContent="center"
      color="white"
      cursor="pointer"
      backdropFilter="blur(8px)"
      _hover={{
        bg: isSynced ? "rgba(72, 187, 120, 0.9)" : "rgba(255, 99, 71, 0.9)",
        transform: "scale(1.05)",
      }}
      transition="all 0.2s"
      onClick={startSync}
      disabled={isSearching || syncStatus !== "idle"}
      aria-label={isSynced ? "Synced to AniList" : "Sync to AniList"}
      title={isSynced ? "Synced to AniList" : "Sync to AniList"}
      _disabled={{
        opacity: 0.6,
        cursor: "not-allowed",
        transform: "none",
      }}
    >
      <SiAnilist size={16} />
    </Box>
  );
};

export default AnilistAnimeTrySearchAndLink;
