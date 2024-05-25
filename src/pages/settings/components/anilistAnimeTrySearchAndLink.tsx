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
import { getDateFromNow } from "@/utils";
import logger from "@/config/logger";

const WEEK_IN_DAYS = 7;

const AnilistAnimeTrySearchAndLink = (video: IVideo) => {
  const { showToast } = useToastContext();
  const { isInitialized: isMediaCacheInitialized, mediaCaches } = useCachedMediaContext();
  const [getMediaBySearch, { data: searchData, loading: searchLoading, error: searchError }] = useGetMediaBySearchLazyQuery();
  const [setMedia, { data: mediaSetData, loading: mediaSetLoading, error: mediaSetError }] = useSetMediaListEntryByAnilistIdMutation();
  const [synced, setSynced] = useState(video.anilist_series_id ? true : false);
  const [existingCacheItem, setExistingCacheItem] = useState<IMediaCache | undefined>(undefined);

  const searchInAnilist = () => {
    const cacheItem = mediaCaches.find((cache) => cache.unique_code === SHA256(video.series_title || "").toString());
    if (cacheItem) {
      logger.info("using existing cache item for sync");
      setExistingCacheItem(cacheItem);
      return;
    }
    logger.info("using anilist to search for series");
    getMediaBySearch({ variables: { search: video.series_title ?? video.video_title } });
  };

  const addCacheMedia = useCallback(
    (searchData?: GetMediaBySearchQuery): IMediaCache => {
      // expire cache item
      const sevenDays = getDateFromNow(WEEK_IN_DAYS).getUTCMilliseconds();

      const cacheItem: IMediaCache = {
        id: self.crypto.randomUUID(),
        series_title: searchData?.Media?.title?.english ?? video.series_title,
        anilist_series_id: searchData?.Media?.id,
        mal_series_id: searchData?.Media?.idMal ?? undefined,
        series_episode_number: searchData?.Media?.episodes ?? undefined,
        series_season_year: searchData?.Media?.seasonYear ?? undefined,
        background_cover_image: searchData?.Media?.coverImage?.extraLarge ?? undefined,
        banner_image: searchData?.Media?.bannerImage ?? undefined,
        created_at: Date.now(),
        expires_at: sevenDays,
        media_type: "ANIME",
        unique_code: SHA256(searchData?.Media?.title?.english || "").toString(),
      };

      eventbus.publish(CACHED_MEDIA_METADATA_ADD_OR_UPDATE, { message: "add cache item", value: cacheItem });
      logger.info("added new cache item");
      return cacheItem;
    },
    [video.series_title]
  );

  useEffect(() => {
    const fetchAndSyncAnilist = async (searchData?: GetMediaBySearchQuery) => {
      const tag = await IndexedDB.getTagByCode("ANILIST");

      let cacheItem = existingCacheItem;
      if (!cacheItem) {
        cacheItem = addCacheMedia(searchData);
      }

      const updatedVideo: IVideo = {
        ...video,
        anilist_series_id: cacheItem.anilist_series_id ?? undefined,
        mal_series_id: cacheItem.mal_series_id ?? undefined,
        series_episode_number: cacheItem.series_episode_number ?? undefined,
        series_season_year: cacheItem.series_season_year ?? undefined,
        background_cover_image: cacheItem.background_cover_image ?? undefined,
        banner_image: cacheItem.banner_image ?? undefined,
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

      if (cacheItem.anilist_series_id || searchData?.Media?.id) {
        const mediaCompletedStatus =
          video.watching_episode_number === cacheItem.series_episode_number ? MediaListStatus.Completed : MediaListStatus.Current;

        setMedia({
          variables: {
            mediaId: cacheItem.anilist_series_id ?? searchData?.Media?.id,
            progress: video.watching_episode_number,
            status: mediaCompletedStatus,
          },
        });

        showToast({
          title: "Anilist media synced!",
          status: "success",
        });
      }

      setSynced(true);
    };

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
  }, [addCacheMedia, existingCacheItem, mediaSetError, searchData, searchError, setMedia, showToast, synced, video]);

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
