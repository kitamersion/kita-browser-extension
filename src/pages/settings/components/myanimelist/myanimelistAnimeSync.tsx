import LoadingState from "@/components/states/LoadingState";
import { IconButton } from "@chakra-ui/react";
import React, { useCallback, useEffect, useState } from "react";
import { SiMyanimelist } from "react-icons/si";
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
import { useMyAnimeListContext } from "@/context/myanimelistContext";
import { KITA_AUTH_PROXY_URL } from "@/data/contants";

const TAG_CODE = "MYANIMELIST";
const EXPIRES_IN_DAYS = 14; // @todo - provide in settings
const DEFAULT_TIMEOUT_OFFSET = 2000;
const MAL_SYNC_PATH = "/mal/sync/anime";
const MAL_MEDIA_SEARCH = "/mal/media/anime";
const MAL_MEDIA_SEARCH_BY_ID = "/mal/media/anime";

enum MyAnimeListAnimeStatus {
  Completed = "completed",
  Current = "watching",
  Dropped = "dropped",
  Paused = "on_hold",
  Planning = "plan_to_watch",
}

type Picture = {
  medium: string;
  large: string;
};

type StartSeason = {
  year: number;
  season: string;
};

type Node = {
  id: number;
  title: string;
  main_picture: Picture;
  start_season: StartSeason;
};

type DataItem = {
  node: Node;
};

type Paging = {
  next: string;
};

type SearchResponse = {
  data: DataItem[];
  paging: Paging;
};

const MyAnimeListAnimeSync = (video: IVideo) => {
  const { showToast } = useToastContext();
  const { isInitialized: isMyAnimeListContextInitialized, myAnimeListAutoSyncMedia, myAnimeListAuth } = useMyAnimeListContext();
  const { isInitialized: isMediaCacheInitialized, mediaCaches } = useCachedMediaContext();

  const [synced, setSynced] = useState(false);
  const [existingCacheItem, setExistingCacheItem] = useState<IMediaCache | undefined>(undefined);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);

  const [searchData, setSearchData] = useState<SearchResponse | undefined>(undefined);

  const addCacheMedia = useCallback(
    (drillSearchItems: Node): IMediaCache | undefined => {
      // expire cache item
      const expiresAt = getDateFromNow(EXPIRES_IN_DAYS, "FUTURE").getTime();

      const cacheItem: IMediaCache = {
        id: self.crypto.randomUUID(),
        series_title: drillSearchItems.title ?? video.series_title,
        mal_series_id: drillSearchItems.id ?? undefined,
        series_episode_number: undefined,
        series_season_year: drillSearchItems.start_season.year ?? undefined,
        background_cover_image: undefined,
        banner_image: undefined,
        watching_episode_number: video.watching_episode_number,
        watching_season_year: video.watching_season_year,
        created_at: Date.now(),
        expires_at: expiresAt,
        media_type: "ANIME",
        unique_code: SHA256(drillSearchItems.title || "").toString(),
        used_by: TAG_CODE,
        is_mal_synced: true,
      };

      eventbus.publish(CACHED_MEDIA_METADATA_ADD_OR_UPDATE, { message: "add cache item", value: cacheItem });
      logger.info("added new cache item");
      return cacheItem;
    },
    [video.series_title, video.watching_episode_number, video.watching_season_year]
  );

  const drillDownSearch = useCallback(async (): Promise<Node | undefined> => {
    if (searchData === undefined) return undefined;
    try {
      for (const item of searchData.data) {
        const response = await fetch(`${KITA_AUTH_PROXY_URL}${MAL_MEDIA_SEARCH_BY_ID}/${item.node.id}`, {
          headers: {
            mal_token: `${myAnimeListAuth?.access_token}`,
          },
          method: "GET",
        });
        const result = (await response.json()) as Node;
        if (result.start_season.year === video.series_season_year) {
          console.log("found item: ", result);
          return result;
        }
      }
    } catch (error) {
      showToast({
        title: "Failed to search series in MyAnimeList",
        description: "Please make sure MyAnimeList integration is enabled. More information in settings page.",
        status: "error",
      });
      logger.error(`Error fetching data: ${error}`);
      return undefined;
    }
  }, [myAnimeListAuth?.access_token, searchData, showToast, video.series_season_year]);

  const searchInMyAnimeList = useCallback(async () => {
    const cacheItem = mediaCaches.find((cache) => cache.unique_code === SHA256(video?.series_title || "").toString());
    if (cacheItem) {
      logger.info("using existing cache item for sync");
      setExistingCacheItem(cacheItem);
      return;
    }
    logger.info("using mal to search for series");
    try {
      const response = await fetch(`${KITA_AUTH_PROXY_URL}${MAL_MEDIA_SEARCH}?q=${video.series_title}`, {
        headers: {
          mal_token: `${myAnimeListAuth?.access_token}`,
        },
        method: "GET",
      });
      const data = (await response.json()) as SearchResponse;
      setSearchData(data);
      console.log("searchData: ", data);
    } catch (error) {
      showToast({
        title: "Failed to search series in MyAnimeList",
        description: "Please make sure MyAnimeList integration is enabled. More information in settings page.",
        status: "error",
      });
      logger.error(`Error fetching data: ${error}`);
    }
  }, [mediaCaches, myAnimeListAuth?.access_token, showToast, video.series_title]);

  const fetchAndSyncMyAnimeList = useCallback(async () => {
    const tag = await IndexedDB.getTagByCode(TAG_CODE);

    const drillSearchItems = await drillDownSearch();

    console.log("drillSearchItems: ", drillSearchItems);

    if (!drillSearchItems) {
      logger.info("no search items found, exiting mal sync");
      return;
    }

    let cacheItem = existingCacheItem;
    if (!cacheItem) {
      cacheItem = addCacheMedia(drillSearchItems);
    }

    const updatedVideo: IVideo = {
      ...video,
      anilist_series_id: cacheItem?.anilist_series_id ?? undefined,
      mal_series_id: drillSearchItems.id || cacheItem?.mal_series_id || undefined,
      series_episode_number: cacheItem?.series_episode_number ?? undefined,
      series_season_year: drillSearchItems.start_season.year || cacheItem?.series_season_year || undefined,
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

    console.log("updatedVideo: ", updatedVideo);
    eventbus.publish(VIDEO_UPDATED_BY_ID, { message: "updating video with myanimelist search", value: updatedVideo });
    eventbus.publish(VIDEO_TAG_ADD_RELATIONSHIP, {
      message: "video tag add relationship from myanimelist",
      value: [videoTagRelationship],
    });

    // if the video is already watched, skip
    // if sync is enabled, syncing items is random, we want to make sure we don't sync if the episode number is less than the current episode number
    if (video.watching_episode_number && cacheItem?.watching_episode_number) {
      if (video?.watching_episode_number < cacheItem?.watching_episode_number) {
        logger.info("skipping sync, current episode is less than or equal to the cache media episode");
        showToast({
          title: "MyAnimeList media synced!",
          status: "success",
        });
        setSynced(true);
        return;
      }
    }
    const mediaCompletedStatus =
      video.watching_episode_number === cacheItem?.series_episode_number
        ? MyAnimeListAnimeStatus.Completed
        : MyAnimeListAnimeStatus.Current;

    console.log("mediaCompletedStatus: ", mediaCompletedStatus);
    try {
      await fetch(`${KITA_AUTH_PROXY_URL}${MAL_SYNC_PATH}/${cacheItem?.mal_series_id}`, {
        headers: {
          mal_token: `${myAnimeListAuth?.access_token}`,
        },
        method: "PUT",
        body: JSON.stringify({
          status: mediaCompletedStatus,
        }),
      });
    } catch (error) {
      showToast({
        title: "Failed to sync series in MyAnimeList",
        description: "Please make sure MyAnimeList integration is enabled. More information in settings page.",
        status: "error",
      });
      logger.error(`Error fetching data: ${error}`);
    }

    // update media cache with watching episode number
    const updatedCacheItem = cacheItem;
    if (updatedCacheItem) {
      updatedCacheItem.watching_episode_number = video.watching_episode_number ?? 0;
      updatedCacheItem.watching_season_year = video.watching_season_year ?? 0;
    }

    console.log("updatedCacheItem: ", updatedCacheItem);
    eventbus.publish(CACHED_MEDIA_METADATA_ADD_OR_UPDATE, { message: "update cache item", value: updatedCacheItem });

    showToast({
      title: "MyAnimeList media synced!",
      status: "success",
    });

    setSynced(true);
  }, [drillDownSearch, existingCacheItem, myAnimeListAuth?.access_token, showToast, video]);

  useEffect(() => {
    if (isMyAnimeListContextInitialized && isMediaCacheInitialized && myAnimeListAutoSyncMedia && !synced) {
      setIsAutoSyncing(true);

      const offset = randomOffset() + DEFAULT_TIMEOUT_OFFSET;
      const timer = setTimeout(async () => {
        await searchInMyAnimeList();
        await fetchAndSyncMyAnimeList();

        // if ((existingCacheItem || searchData) && !synced) {
        //   fetchAndSyncMyAnimeList(searchData || undefined);
        // }
        setIsAutoSyncing(false);
      }, offset);

      return () => clearTimeout(timer);
    }
  }, [
    existingCacheItem,
    fetchAndSyncMyAnimeList,
    isMediaCacheInitialized,
    isMyAnimeListContextInitialized,
    myAnimeListAutoSyncMedia,
    searchData,
    searchInMyAnimeList,
    synced,
  ]);

  useEffect(() => {
    if ((existingCacheItem || searchData) && !synced) {
      fetchAndSyncMyAnimeList();
    }
  }, [existingCacheItem, fetchAndSyncMyAnimeList, searchData, showToast, synced]);

  if (!isMyAnimeListContextInitialized || !isMediaCacheInitialized) {
    return <LoadingState />;
  }

  if (isAutoSyncing) {
    return <LoadingState />;
  }

  return (
    <IconButton
      icon={<SiMyanimelist />}
      aria-label="Sync to MyAnimeList"
      variant="ghost"
      rounded="full"
      title="Sync to MyAnimeList"
      onClick={searchInMyAnimeList}
    />
  );
};

export default MyAnimeListAnimeSync;
