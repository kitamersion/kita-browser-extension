import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import { IVideo } from "@/types/video";
import { deleteAllVideos, deleteVideoById, getVideos } from "@/api/videostorage";
import eventBus from "@/api/eventbus";
import { VIDEO_DELETED_BY_ID, VIDEO_DELETE_ALL, VIDEO_REFRESH } from "@/data/events";

interface VideoContextType {
  totalVideos: IVideo[];
  totalDuration: number;
  isInitialized: boolean;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export const useVideoContext = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideoContext must be used within a video provider");
  }
  return context;
};

export const VideoProvider = ({ children }: PropsWithChildren<unknown>) => {
  const [totalVideos, setTotalVideos] = useState<IVideo[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const handleGetVideos = useCallback(() => {
    getVideos((data) => {
      setTotalVideos(data);
      const totalTimeInSeconds = data.reduce((total, video) => total + video.video_duration, 0);
      setTotalDuration(totalTimeInSeconds);
    });
  }, []);

  const handleDeleteAllVideos = useCallback(() => {
    deleteAllVideos(() => {
      setTotalVideos([]);
      setTotalDuration(0);
    });
  }, []);

  const handleDeleteById = useCallback(
    (eventData: any) => {
      const id = eventData.value.id as string;
      if (!id) {
        console.warn("No video id found from event handler");
        return;
      }
      deleteVideoById(id, totalVideos, (data) => {
        setTotalVideos(data);
        const totalTimeInSeconds = data.reduce((total, video) => total + video.video_duration, 0);
        setTotalDuration(totalTimeInSeconds);
      });
    },
    [totalVideos]
  );

  useEffect(() => {
    if (!isInitialized) {
      handleGetVideos();
      setIsInitialized(true);
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

  return <VideoContext.Provider value={{ totalVideos, totalDuration, isInitialized }}>{children}</VideoContext.Provider>;
};
