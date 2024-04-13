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
  const { showToast } = useToastContext();
  const [totalVideos, setTotalVideos] = useState<IVideo[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const handleGetVideos = useCallback(() => {
    getVideos((data) => {
      setTotalVideos(data);
      const totalTimeInSeconds = data.reduce((total, video) => total + video.video_duration, 0);
      setTotalDuration(totalTimeInSeconds);
      showToast({
        title: `Fetched ${data.length} videos`,
        status: "success",
      });
    });
  }, [showToast]);

  const handleDeleteAllVideos = useCallback(() => {
    deleteAllVideos(() => {
      setTotalVideos([]);
      setTotalDuration(0);
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
        const totalTimeInSeconds = data.reduce((total, video) => total + video.video_duration, 0);
        setTotalDuration(totalTimeInSeconds);
        showToast({
          title: "Video deleted",
          status: "success",
        });
      });
    },
    [showToast, totalVideos]
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
        const totalTimeInSeconds = data.reduce((total, video) => total + video.video_duration, 0);
        setTotalDuration(totalTimeInSeconds);
        showToast({
          title: "Video updated",
          status: "success",
        });
      });
    },
    [showToast, totalVideos]
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
        const totalTimeInSeconds = updatedVideos.reduce((total, video) => total + video.video_duration, 0);
        setTotalDuration(totalTimeInSeconds);
      });
    },
    [totalVideos]
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

  return <VideoContext.Provider value={{ totalVideos, totalDuration, isInitialized }}>{children}</VideoContext.Provider>;
};
