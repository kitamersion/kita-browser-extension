import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import { IVideo } from "@/types/video";
import eventBus, { PublishData } from "@/api/eventbus";
import {
  CASCADE_REMOVE_TAG_FROM_VIDEO_BY_TAG_ID,
  VIDEO_ADD,
  VIDEO_DELETED_BY_ID,
  VIDEO_DELETE_ALL,
  VIDEO_REFRESH,
  VIDEO_UPDATED_BY_ID,
} from "@/data/events";
import { useToastContext } from "./toastNotificationContext";
import {
  decrementTotalVideoDuration,
  decrementTotalVideos,
  incrementTotalVideoDuration,
  incrementTotalVideos,
  resetTotalVideoDuration,
  resetTotalVideos,
} from "@/api/summaryStorage/video";
import IndexedDB from "@/db/index";
import { useApplicationContext } from "./applicationContext";
import { filterVideos, generateUniqueCode, getDateFromNow } from "@/utils";
import { logger } from "@kitamersion/kita-logging";

const DAY_IN_DAYS = 1;
const WEEK_IN_DAYS = 7;
const MONTH_IN_DAYS = 30;
const YEAR_IN_DAYS = 365;

type VideoContextType = {
  totalVideos: IVideo[];
  totalVideoCount: number;
  totalDuration: number;
  totalDurationDay: number;
  totalDurationWeek: number;
  totalDurationMonth: number;
  totalDurationYear: number;
  isInitialized: boolean;
};

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export const useVideoContext = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideoContext must be used within a video provider");
  }
  return context;
};

export const VideoProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { isInitialized: isAppInitialized, isApplicationEnabled } = useApplicationContext();
  const { showToast } = useToastContext();
  const [totalVideos, setTotalVideos] = useState<IVideo[]>([]);
  const [totalVideoCount, setTotalVideoCount] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [totalDurationDay, setTotalDurationDay] = useState<number>(0);
  const [totalDurationWeek, setTotalDurationWeek] = useState<number>(0);
  const [totalDurationMonth, setTotalDurationMonth] = useState<number>(0);
  const [totalDurationYear, setTotalDurationYear] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const calculateTotalDuration = (videos: IVideo[]): number => {
    return videos.reduce((total, video) => total + video.video_duration, 0);
  };

  const calculateDurationByDate = useCallback((videos: IVideo[], days: number): number => {
    const date = getDateFromNow(days);
    const filteredVideos = filterVideos(videos, date);
    return calculateTotalDuration(filteredVideos);
  }, []);

  const handleGetVideoSummary = useCallback(async () => {
    try {
      // Compute values directly from database instead of Chrome storage
      const allVideos = await IndexedDB.getAllVideos();
      const totalDuration = calculateTotalDuration(allVideos);
      const totalCount = allVideos.length;

      // Use functional state updates to ensure we get the latest state
      setTotalDuration(totalDuration);
      setTotalVideoCount(totalCount);
    } catch (error) {
      logger.error(`Error getting video summary: ${error}`);
    }
  }, []);

  const handleGetVideos = useCallback(async () => {
    const allVideos = await IndexedDB.getAllVideos();
    setTotalVideos(allVideos);

    const totalDurationDay = calculateDurationByDate(allVideos, DAY_IN_DAYS);
    const totalDurationWeek = calculateDurationByDate(allVideos, WEEK_IN_DAYS);
    const totalDurationMonth = calculateDurationByDate(allVideos, MONTH_IN_DAYS);
    const totalDurationYear = calculateDurationByDate(allVideos, YEAR_IN_DAYS);
    setTotalDurationDay(totalDurationDay);
    setTotalDurationWeek(totalDurationWeek);
    setTotalDurationMonth(totalDurationMonth);
    setTotalDurationYear(totalDurationYear);
  }, [calculateDurationByDate]);

  const handleDeleteAllVideos = useCallback(async () => {
    await IndexedDB.deleteAllVideos();
    await IndexedDB.deleteAllVideoTags();

    resetTotalVideos();
    resetTotalVideoDuration();

    setTotalVideos([]);
    setTotalDuration(0);
    setTotalDurationDay(0);
    setTotalDurationWeek(0);
    setTotalDurationMonth(0);
    setTotalDurationYear(0);

    handleGetVideoSummary();

    showToast({
      title: "Videos deleted",
      status: "success",
    });
  }, [handleGetVideoSummary, showToast]);

  const handleDeleteById = useCallback(
    async (eventData: any) => {
      const id = eventData.value.id as string;
      if (!id) {
        logger.warn("No video id found from event handler");
        return;
      }

      const videoToDeleteDuration = totalVideos.find((video) => video.id === id);

      await IndexedDB.deleteVideoById(id);
      await IndexedDB.deleteVideoTagByVideoId(id);
      decrementTotalVideos();

      if (videoToDeleteDuration) {
        decrementTotalVideoDuration(videoToDeleteDuration.video_duration);
      }

      handleGetVideoSummary();
      handleGetVideos();

      showToast({
        title: "Video deleted",
        status: "success",
      });
    },
    [handleGetVideoSummary, handleGetVideos, showToast, totalVideos]
  );

  const handleUpdateVideoById = useCallback(
    async (eventData: PublishData) => {
      if (!eventData) {
        logger.warn("No video data found from event handler");
        return;
      }
      const updatedVideo = eventData.value as IVideo;

      // calculate how much duration needs to increase or decrease.
      const oldVideo = totalVideos.find((v) => v.id === updatedVideo.id);
      let durationDifference = 0;
      if (oldVideo) {
        durationDifference = updatedVideo.video_duration - oldVideo.video_duration;
        incrementTotalVideoDuration(durationDifference);
      }

      await IndexedDB.updateVideoById(updatedVideo);
      handleGetVideoSummary();
      handleGetVideos();

      showToast({
        title: "Video updated",
        status: "success",
      });
    },
    [handleGetVideoSummary, handleGetVideos, showToast, totalVideos]
  );

  const handleRemoveTagFromVideoById = useCallback(
    async (eventData: any) => {
      const id = eventData.value.id as string;
      if (!id) {
        logger.warn("No tag id found from event handler");
        return;
      }
      // check totalVideos for videos with tag id and remove the tag from the video tags property the record then call setVideos to update storage
      const updatedVideos = totalVideos.map((video) => {
        const index = video.tags?.findIndex((t) => t === id) ?? -1;
        if (index !== -1) {
          video.tags?.splice(index, 1);
        }
        return video;
      });

      setTotalVideos(updatedVideos);
      const totalDurationDay = calculateDurationByDate(updatedVideos, DAY_IN_DAYS);
      const totalDurationWeek = calculateDurationByDate(updatedVideos, WEEK_IN_DAYS);
      const totalDurationMonth = calculateDurationByDate(updatedVideos, MONTH_IN_DAYS);
      const totalDurationYear = calculateDurationByDate(updatedVideos, YEAR_IN_DAYS);
      setTotalDurationDay(totalDurationDay);
      setTotalDurationWeek(totalDurationWeek);
      setTotalDurationMonth(totalDurationMonth);
      setTotalDurationYear(totalDurationYear);

      await IndexedDB.deleteVideoTagByTagId(id);
    },
    [calculateDurationByDate, totalVideos]
  );

  const handleVideoAdd = useCallback(
    async (eventData: any) => {
      const videoToAdd = eventData.value as IVideo;
      if (!videoToAdd) {
        logger.warn("No video data found from event handler");
        return;
      }

      try {
        const uniqueCode = generateUniqueCode(videoToAdd.video_title, origin);
        const hasExistingVideoItem = await IndexedDB.getVideoByUniqueCode(uniqueCode);
        if (hasExistingVideoItem) {
          logger.info("video already exists, skipping...");
          return;
        }
        await IndexedDB.addVideo({ ...videoToAdd, unique_code: uniqueCode });
        incrementTotalVideos();
        incrementTotalVideoDuration(videoToAdd.video_duration ?? 0);
      } catch (error) {
        logger.error(`error while adding video: ${error}`);
      }

      handleGetVideos();
      handleGetVideoSummary();
      showToast({
        title: "Video added",
        status: "success",
      });
    },
    [handleGetVideoSummary, handleGetVideos, showToast]
  );

  useEffect(() => {
    if (!isInitialized && isAppInitialized && isApplicationEnabled) {
      handleGetVideos();
      handleGetVideoSummary();
      setIsInitialized(true);
      return () => {};
    }
  }, [handleGetVideoSummary, handleGetVideos, isAppInitialized, isApplicationEnabled, isInitialized]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  // handle VIDEO_ADD
  useEffect(() => {
    eventBus.subscribe(VIDEO_ADD, handleVideoAdd);
    return () => {
      eventBus.unsubscribe(VIDEO_ADD, handleVideoAdd);
    };
  }, [handleVideoAdd]);

  // handle VIDEO_DELETED_BY_ID
  useEffect(() => {
    eventBus.subscribe(VIDEO_DELETED_BY_ID, handleDeleteById);
    return () => {
      eventBus.unsubscribe(VIDEO_DELETED_BY_ID, handleDeleteById);
    };
  }, [handleDeleteById]);

  // handle VIDEO_REFRESH
  useEffect(() => {
    eventBus.subscribe(VIDEO_REFRESH, handleGetVideos);
    return () => {
      eventBus.unsubscribe(VIDEO_REFRESH, handleGetVideos);
    };
  }, [handleGetVideos]);

  // handle VIDEO_DELETE_ALL
  useEffect(() => {
    eventBus.subscribe(VIDEO_DELETE_ALL, handleDeleteAllVideos);
    return () => {
      eventBus.unsubscribe(VIDEO_DELETE_ALL, handleDeleteAllVideos);
    };
  }, [handleDeleteAllVideos]);

  // handle VIDEO_UPDATED_BY_ID
  useEffect(() => {
    eventBus.subscribe(VIDEO_UPDATED_BY_ID, handleUpdateVideoById);
    return () => {
      eventBus.unsubscribe(VIDEO_UPDATED_BY_ID, handleUpdateVideoById);
    };
  }, [handleUpdateVideoById]);

  // handle CASCADE_REMOVE_TAG_FROM_VIDEO_BY_TAG_ID
  useEffect(() => {
    eventBus.subscribe(CASCADE_REMOVE_TAG_FROM_VIDEO_BY_TAG_ID, handleRemoveTagFromVideoById);
    return () => {
      eventBus.unsubscribe(CASCADE_REMOVE_TAG_FROM_VIDEO_BY_TAG_ID, handleRemoveTagFromVideoById);
    };
  }, [handleRemoveTagFromVideoById]);

  return (
    <VideoContext.Provider
      value={{
        totalVideos,
        totalVideoCount,
        totalDuration,
        totalDurationDay,
        totalDurationWeek,
        totalDurationMonth,
        totalDurationYear,
        isInitialized,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
};
