import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import { IVideo } from "@/types/video";
import { deleteAllVideos, deleteVideoById, getVideos, setVideos, updateVideoById } from "@/api/videostorage";
import eventBus, { PublishData } from "@/api/eventbus";
import {
  CASCADE_REMOVE_TAG_FROM_VIDEO_BY_ID,
  VIDEO_DELETED_BY_ID,
  VIDEO_DELETE_ALL,
  VIDEO_REFRESH,
  VIDEO_UPDATED_BY_ID,
} from "@/data/events";
import { useToastContext } from "./toastNotificationContext";

const WEEK_IN_DAYS = 7;
const MONTH_IN_DAYS = 30;
const YEAR_IN_DAYS = 365;

type VideoContextType = {
  totalVideos: IVideo[];
  totalDuration: number;
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
  const { showToast } = useToastContext();
  const [totalVideos, setTotalVideos] = useState<IVideo[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [totalDurationWeek, setTotalDurationWeek] = useState<number>(0);
  const [totalDurationMonth, setTotalDurationMonth] = useState<number>(0);
  const [totalDurationYear, setTotalDurationYear] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const filterVideos = (videos: IVideo[], date: Date): IVideo[] => {
    const now = date.getTime();
    return videos.filter((video) => video.created_at > now);
  };

  const getDateFromNow = (days: number) => {
    const now = new Date();
    now.setDate(now.getDate() - days);
    return now;
  };

  const calculateTotalDuration = (videos: IVideo[]): number => {
    return videos.reduce((total, video) => total + video.video_duration, 0);
  };

  const calculateDurationByDate = useCallback((videos: IVideo[], days: number): number => {
    const date = getDateFromNow(days);
    const filteredVideos = filterVideos(videos, date);
    return calculateTotalDuration(filteredVideos);
  }, []);

  const handleGetVideos = useCallback(() => {
    getVideos((data) => {
      setTotalVideos(data);

      setTotalVideos(data);
      const totalTimeInSeconds = calculateTotalDuration(data);
      const totalDurationWeek = calculateDurationByDate(data, WEEK_IN_DAYS);
      const totalDurationMonth = calculateDurationByDate(data, MONTH_IN_DAYS);
      const totalDurationYear = calculateDurationByDate(data, YEAR_IN_DAYS);
      setTotalDuration(totalTimeInSeconds);
      setTotalDurationWeek(totalDurationWeek);
      setTotalDurationMonth(totalDurationMonth);
      setTotalDurationYear(totalDurationYear);
    });
  }, [calculateDurationByDate]);

  const handleDeleteAllVideos = useCallback(() => {
    deleteAllVideos(() => {
      setTotalVideos([]);
      setTotalDuration(0);
      setTotalDurationWeek(0);
      setTotalDurationMonth(0);
      setTotalDurationYear(0);
      showToast({
        title: "Videos deleted",
        status: "success",
      });
    });
  }, [showToast]);

  const handleDeleteById = useCallback(
    (eventData: any) => {
      const id = eventData.value.id as string;
      if (!id) {
        console.warn("No video id found from event handler");
        return;
      }
      deleteVideoById(id, totalVideos, (data) => {
        setTotalVideos(data);
        const totalTimeInSeconds = calculateTotalDuration(data);
        const totalDurationWeek = calculateDurationByDate(data, WEEK_IN_DAYS);
        const totalDurationMonth = calculateDurationByDate(data, MONTH_IN_DAYS);
        const totalDurationYear = calculateDurationByDate(data, YEAR_IN_DAYS);
        setTotalDuration(totalTimeInSeconds);
        setTotalDurationWeek(totalDurationWeek);
        setTotalDurationMonth(totalDurationMonth);
        setTotalDurationYear(totalDurationYear);
        showToast({
          title: "Video deleted",
          status: "success",
        });
      });
    },
    [calculateDurationByDate, showToast, totalVideos]
  );

  const handleUpdateVideoById = useCallback(
    (eventData: PublishData) => {
      if (!eventData) {
        console.warn("No video data found from event handler");
        return;
      }

      const updatedVideo = eventData.value as IVideo;

      updateVideoById(updatedVideo.id, updatedVideo, totalVideos, (data) => {
        setTotalVideos(data);
        const totalTimeInSeconds = calculateTotalDuration(data);
        const totalDurationWeek = calculateDurationByDate(data, WEEK_IN_DAYS);
        const totalDurationMonth = calculateDurationByDate(data, MONTH_IN_DAYS);
        const totalDurationYear = calculateDurationByDate(data, YEAR_IN_DAYS);
        setTotalDuration(totalTimeInSeconds);
        setTotalDurationWeek(totalDurationWeek);
        setTotalDurationMonth(totalDurationMonth);
        setTotalDurationYear(totalDurationYear);
        showToast({
          title: "Video updated",
          status: "success",
        });
      });
    },
    [calculateDurationByDate, showToast, totalVideos]
  );

  const handleRemoveTagFromVideoById = useCallback(
    (eventData: any) => {
      const id = eventData.value.id as string;
      if (!id) {
        console.warn("No tag id found from event handler");
        return;
      }
      // check totalVideos for videos with tag id and remove the tag from the video tags property the record then call setVideos to update storage
      const updatedVideos = totalVideos.map((video) => {
        const index = video.tags.findIndex((t) => t === id);
        if (index !== -1) {
          video.tags.splice(index, 1);
        }
        return video;
      });
      setVideos(updatedVideos, () => {
        setTotalVideos(updatedVideos);
        const totalTimeInSeconds = calculateTotalDuration(updatedVideos);
        const totalDurationWeek = calculateDurationByDate(updatedVideos, WEEK_IN_DAYS);
        const totalDurationMonth = calculateDurationByDate(updatedVideos, MONTH_IN_DAYS);
        const totalDurationYear = calculateDurationByDate(updatedVideos, YEAR_IN_DAYS);
        setTotalDuration(totalTimeInSeconds);
        setTotalDurationWeek(totalDurationWeek);
        setTotalDurationMonth(totalDurationMonth);
        setTotalDurationYear(totalDurationYear);
      });
    },
    [calculateDurationByDate, totalVideos]
  );

  useEffect(() => {
    if (!isInitialized) {
      handleGetVideos();
      setIsInitialized(true);
      return () => {};
    }
  }, [handleGetVideos, isInitialized]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

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

  // handle CASCADE_REMOVE_TAG_FROM_VIDEO_BY_ID
  useEffect(() => {
    eventBus.subscribe(CASCADE_REMOVE_TAG_FROM_VIDEO_BY_ID, handleRemoveTagFromVideoById);
    return () => {
      eventBus.unsubscribe(CASCADE_REMOVE_TAG_FROM_VIDEO_BY_ID, handleRemoveTagFromVideoById);
    };
  }, [handleRemoveTagFromVideoById]);

  return (
    <VideoContext.Provider
      value={{
        totalVideos,
        totalDuration,
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
