import LoadingState from "@/components/states/LoadingState";
import { GetMediaBySearchQuery, MediaListStatus, useGetMediaBySearchLazyQuery, useSetMediaListEntryByAnilistIdMutation } from "@/graphql";
import { IconButton } from "@chakra-ui/react";
import React, { useCallback, useEffect, useState } from "react";
import { SiAnilist } from "react-icons/si";
import eventbus from "@/api/eventbus";
import { IVideo } from "@/types/video";
import { CACHED_MEDIA_METADATA_ADD_OR_UPDATE, VIDEO_TAG_ADD_RELATIONSHIP, VIDEO_UPDATED_BY_ID } from "@/data/events";
import { useToastContext } from "@/context/toastNotificationContext";
import IndexedDB from "@/db/index";
import { IVideoTag } from "@/types/relationship";
import { useCachedMediaContext } from "@/context/cachedMediaContext";
import { IMediaCache } from "@/types/integrations/cache";
import { SHA256 } from "crypto-js";
import { getDateFromNow, randomOffset } from "@/utils";
import logger from "@/config/logger";
import { useAnilistContext } from "@/context/anilistContext";

const EXPIRES_IN_DAYS = 14;
const DEFAULT_TIMEOUT_OFFSET = 2000;

const AnilistAnimeTrySearchAndLink = (video: IVideo) => {
  const { showToast } = useToastContext();
  const { isInitialized: isAnilistReady, anilistAutoSyncMedia } = useAnilistContext();
  const { isInitialized: isCacheReady, mediaCaches } = useCachedMediaContext();

  const [getMediaBySearch, { data: searchData, loading: isSearching, error: searchError }] = useGetMediaBySearchLazyQuery();
  const [setMedia, { loading: isUpdatingList, error: updateError }] = useSetMediaListEntryByAnilistIdMutation();

  const [isSynced, setIsSynced] = useState(!!video.anilist_series_id);
  const [cachedMedia, setCachedMedia] = useState<IMediaCache | undefined>();
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Helper functions
  const findExistingCache = useCallback(() => {
    const uniqueCode = SHA256(video?.series_title || "").toString();
    return mediaCaches.find((cache) => cache.unique_code === uniqueCode);
  }, [mediaCaches, video.series_title]);

  const searchAnimeInAnilist = useCallback(() => {
    const existingCache = findExistingCache();
    if (existingCache) {
      logger.info("using existing cache item for sync");
      setCachedMedia(existingCache);
      return;
    }
    logger.info("searching for anime in AniList");
    getMediaBySearch({ variables: { search: video.series_title, isAdult: false } });
  }, [findExistingCache, getMediaBySearch, video.series_title]);

  const createCacheFromSearchResults = useCallback(
    (searchResults?: GetMediaBySearchQuery): IMediaCache | undefined => {
      const matchingAnime = searchResults?.anime?.results?.find((result) => result?.seasonYear === video.watching_season_year);

      if (!matchingAnime) return undefined;

      const expiresAt = getDateFromNow(EXPIRES_IN_DAYS, "FUTURE").getTime();
      const uniqueCode = SHA256(matchingAnime?.title?.english || "").toString();

      const newCacheItem: IMediaCache = {
        id: self.crypto.randomUUID(),
        series_title: matchingAnime?.title?.english ?? video.series_title,
        anilist_series_id: matchingAnime?.id,
        mal_series_id: matchingAnime?.idMal ?? undefined,
        series_episode_number: matchingAnime?.episodes ?? undefined,
        series_season_year: matchingAnime?.seasonYear ?? undefined,
        background_cover_image: matchingAnime?.coverImage?.extraLarge ?? undefined,
        banner_image: matchingAnime?.bannerImage ?? undefined,
        watching_episode_number: video.watching_episode_number,
        watching_season_year: video.watching_season_year,
        created_at: Date.now(),
        expires_at: expiresAt,
        media_type: "ANIME",
        unique_code: uniqueCode,
      };

      eventbus.publish(CACHED_MEDIA_METADATA_ADD_OR_UPDATE, {
        message: "add cache item",
        value: newCacheItem,
      });
      logger.info("added new cache item");
      return newCacheItem;
    },
    [video]
  );

  const fetchAndSyncAnilist = useCallback(
    async (searchData?: GetMediaBySearchQuery) => {
      const tag = await IndexedDB.getTagByCode("ANILIST");

      let cacheItem = cachedMedia;
      if (!cacheItem) {
        cacheItem = createCacheFromSearchResults(searchData);
      }

      const updatedVideo: IVideo = {
        ...video,
        anilist_series_id: cacheItem?.anilist_series_id ?? undefined,
        mal_series_id: cacheItem?.mal_series_id ?? undefined,
        series_episode_number: cacheItem?.series_episode_number ?? undefined,
        series_season_year: cacheItem?.series_season_year ?? undefined,
        background_cover_image: cacheItem?.background_cover_image ?? undefined,
        banner_image: cacheItem?.banner_image ?? undefined,
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

      // if the video is already watched, skip
      // if sync is enabled, syncing items is random, we want to make sure we don't sync if the episode number is less than the current episode number
      if (video.watching_episode_number && cacheItem?.watching_episode_number) {
        if (video?.watching_episode_number < cacheItem?.watching_episode_number) {
          logger.info("skipping sync, current episode is less than or equal to the cache media episode");
          showToast({
            title: "Anilist media synced!",
            status: "success",
          });
          setIsSynced(true);
          return;
        }
      }
      const mediaCompletedStatus =
        video.watching_episode_number === cacheItem?.series_episode_number ? MediaListStatus.Completed : MediaListStatus.Current;

      setMedia({
        variables: {
          mediaId: cacheItem?.anilist_series_id,
          progress: video.watching_episode_number,
          status: mediaCompletedStatus,
        },
      });

      // update media cache with watching episode number
      const updatedCacheItem = cacheItem;
      if (updatedCacheItem) {
        updatedCacheItem.watching_episode_number = video.watching_episode_number ?? 0;
        updatedCacheItem.watching_season_year = video.watching_season_year ?? 0;
      }

      eventbus.publish(CACHED_MEDIA_METADATA_ADD_OR_UPDATE, { message: "update cache item", value: updatedCacheItem });

      showToast({
        title: "Anilist media synced!",
        status: "success",
      });

      setIsSynced(true);
    },
    [createCacheFromSearchResults, cachedMedia, setMedia, showToast, video]
  );

  useEffect(() => {
    if (isAnilistReady && isCacheReady && anilistAutoSyncMedia && !isSynced) {
      setIsAutoSyncing(true);

      const offset = randomOffset() + DEFAULT_TIMEOUT_OFFSET;
      const timer = setTimeout(() => {
        searchAnimeInAnilist();
        if ((cachedMedia || searchData) && !isSynced) {
          fetchAndSyncAnilist(searchData || undefined);
        }
        setIsAutoSyncing(false);
      }, offset);

      return () => clearTimeout(timer);
    }
  }, [anilistAutoSyncMedia, cachedMedia, fetchAndSyncAnilist, isAnilistReady, isCacheReady, searchData, searchAnimeInAnilist, isSynced]);

  useEffect(() => {
    if ((cachedMedia || searchData) && !isSynced) {
      fetchAndSyncAnilist(searchData || undefined);
    }

    if (searchError) {
      showToast({
        title: "Failed to search series in Anilist",
        description: "Please make sure Anilist integration is enabled. More information in settings page.",
        status: "error",
      });
    }

    if (updateError) {
      showToast({
        title: "Failed to sync media to Anilist",
        status: "error",
      });
    }
  }, [cachedMedia, fetchAndSyncAnilist, updateError, searchData, searchError, showToast, isSynced]);

  if (!isAnilistReady || !isCacheReady) {
    return <LoadingState />;
  }

  if (isAutoSyncing) {
    return <LoadingState />;
  }

  if (isSearching || isUpdatingList) {
    return <LoadingState />;
  }

  return (
    <IconButton
      icon={<SiAnilist />}
      aria-label="Sync to Anilist"
      variant="ghost"
      rounded="full"
      title="Search in Anilist"
      onClick={searchAnimeInAnilist}
    />
  );
};

export default AnilistAnimeTrySearchAndLink;
