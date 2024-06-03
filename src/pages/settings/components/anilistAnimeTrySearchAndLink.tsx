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

const EXPIRES_IN_DAYS = 1;
const DEFAULT_TIMEOUT_OFFSET = 2000;

const AnilistAnimeTrySearchAndLink = (video: IVideo) => {
  const { showToast } = useToastContext();
  const { isInitialized: isAnilistContextInitialized, anilistAutoSyncMedia } = useAnilistContext();
  const { isInitialized: isMediaCacheInitialized, mediaCaches } = useCachedMediaContext();
  const [getMediaBySearch, { data: searchData, loading: searchLoading, error: searchError }] = useGetMediaBySearchLazyQuery();
  const [setMedia, { data: mediaSetData, loading: mediaSetLoading, error: mediaSetError }] = useSetMediaListEntryByAnilistIdMutation();
  const [synced, setSynced] = useState(video.anilist_series_id ? true : false);
  const [existingCacheItem, setExistingCacheItem] = useState<IMediaCache | undefined>(undefined);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);

  const searchInAnilist = useCallback(() => {
    const cacheItem = mediaCaches.find((cache) => cache.unique_code === SHA256(video?.series_title || "").toString());
    if (cacheItem) {
      logger.info("using existing cache item for sync");
      setExistingCacheItem(cacheItem);
      return;
    }
    logger.info("using anilist to search for series");
    getMediaBySearch({ variables: { search: video.series_title, isAdult: false } });
  }, [getMediaBySearch, mediaCaches, video.series_title]);

  const addCacheMedia = useCallback(
    (searchData?: GetMediaBySearchQuery): IMediaCache | undefined => {
      const getMediaBySeasonYear = searchData?.anime?.results?.find((result) => result?.seasonYear === video.watching_season_year);

      if (!getMediaBySeasonYear) {
        return undefined;
      }

      // expire cache item
      const expiresAt = getDateFromNow(EXPIRES_IN_DAYS, "FUTURE").getTime();

      const cacheItem: IMediaCache = {
        id: self.crypto.randomUUID(),
        series_title: getMediaBySeasonYear?.title?.english ?? video.series_title,
        anilist_series_id: getMediaBySeasonYear?.id,
        mal_series_id: getMediaBySeasonYear?.idMal ?? undefined,
        series_episode_number: getMediaBySeasonYear?.episodes ?? undefined,
        series_season_year: getMediaBySeasonYear?.seasonYear ?? undefined,
        background_cover_image: getMediaBySeasonYear?.coverImage?.extraLarge ?? undefined,
        banner_image: getMediaBySeasonYear?.bannerImage ?? undefined,
        watching_episode_number: video.watching_episode_number,
        watching_season_year: video.watching_season_year,
        created_at: Date.now(),
        expires_at: expiresAt,
        media_type: "ANIME",
        unique_code: SHA256(getMediaBySeasonYear?.title?.english || "").toString(),
      };

      eventbus.publish(CACHED_MEDIA_METADATA_ADD_OR_UPDATE, { message: "add cache item", value: cacheItem });
      logger.info("added new cache item");
      return cacheItem;
    },
    [video.series_title, video.watching_episode_number, video.watching_season_year]
  );

  const fetchAndSyncAnilist = useCallback(
    async (searchData?: GetMediaBySearchQuery) => {
      const tag = await IndexedDB.getTagByCode("ANILIST");

      let cacheItem = existingCacheItem;
      if (!cacheItem) {
        cacheItem = addCacheMedia(searchData);
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
          setSynced(true);
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

      setSynced(true);
    },
    [addCacheMedia, existingCacheItem, setMedia, showToast, video]
  );

  useEffect(() => {
    if (isAnilistContextInitialized && isMediaCacheInitialized && anilistAutoSyncMedia && !synced) {
      setIsAutoSyncing(true);

      const offset = randomOffset() + DEFAULT_TIMEOUT_OFFSET;
      const timer = setTimeout(() => {
        searchInAnilist();
        if ((existingCacheItem || searchData) && !synced) {
          fetchAndSyncAnilist(searchData || undefined);
        }
        setIsAutoSyncing(false);
      }, offset);

      return () => clearTimeout(timer);
    }
  }, [
    anilistAutoSyncMedia,
    existingCacheItem,
    fetchAndSyncAnilist,
    isAnilistContextInitialized,
    isMediaCacheInitialized,
    searchData,
    searchInAnilist,
    synced,
  ]);

  useEffect(() => {
    if ((existingCacheItem || searchData) && !synced) {
      fetchAndSyncAnilist(searchData || undefined);
    }

    if (searchError) {
      showToast({
        title: "Failed to search series in Anilist",
        description: "Please make sure Anilist integration is enabled. More information in settings page.",
        status: "error",
      });
    }

    if (mediaSetError) {
      showToast({
        title: "Failed to sync media to Anilist",
        status: "error",
      });
    }
  }, [existingCacheItem, fetchAndSyncAnilist, mediaSetError, searchData, searchError, showToast, synced]);

  if (!isAnilistContextInitialized || !isMediaCacheInitialized) {
    return <LoadingState />;
  }

  if (isAutoSyncing) {
    return <LoadingState />;
  }

  if (searchLoading || mediaSetLoading) {
    return <LoadingState />;
  }

  return (
    <IconButton
      icon={<SiAnilist />}
      aria-label="Sync to Anilist"
      variant="ghost"
      rounded="full"
      title="Search in Anilist"
      onClick={searchInAnilist}
    />
  );
};

export default AnilistAnimeTrySearchAndLink;
