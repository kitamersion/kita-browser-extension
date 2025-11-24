import React, { createContext, useEffect, PropsWithChildren, useContext, useCallback, useState } from "react";
import {
  VIDEO_TAG_ADD_RELATIONSHIP,
  VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID,
  VIDEO_TAG_REMOVE_RELATIONSHIP_BY_VIDEO_ID,
} from "@/data/events";
import eventBus from "@/api/eventbus";
import { IVideoTag } from "@/types/relationship";
import IndexedDB from "@/db/index";
import { useApplicationContext } from "./applicationContext";
import { logger } from "@kitamersion/kita-logging";

type VideoTagRelationshipContextType = {
  videoTagRelationship: IVideoTag[];
  isInitialized: boolean;
};

const VideoTagRelationshipContext = createContext<VideoTagRelationshipContextType | undefined>(undefined);

export const useVideoTagRelationshipContext = () => {
  const context = useContext(VideoTagRelationshipContext);
  if (!context) {
    throw new Error("useVideoTagRelationshipContext must be used within a application provider");
  }
  return context;
};

export const VideoTagRelationshipProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { isInitialized: isAppInitialized, isApplicationEnabled } = useApplicationContext();
  const [relationships, setRelationships] = useState<IVideoTag[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const handleVideoTagAddRelationship = useCallback(async (eventData: any) => {
    const videoTagRelationship = eventData.value as IVideoTag[];

    if (!videoTagRelationship || videoTagRelationship.length === 0) {
      logger.warn("No video tag relationship found from event handler");
      return;
    }

    // for each items in videoTagRelationship, add to indexedDB
    videoTagRelationship.forEach(async (videoTagRelationship) => {
      await IndexedDB.addVideoTag(videoTagRelationship);
      setRelationships((prev) => [...prev, videoTagRelationship]);
    });
  }, []);

  const handleVideoTagDeleteRelationshipByTagId = useCallback(async (eventData: any) => {
    const tagId = eventData.value as string;

    if (!tagId) {
      logger.warn("No tag id found from event handler");
      return;
    }

    await IndexedDB.deleteVideoTagByTagId(tagId);
    setRelationships((prev) => prev.filter((item) => item.tag_id !== tagId));
  }, []);

  const handleVideoTagDeleteRelationshipByVideoId = useCallback(async (eventData: any) => {
    const videoId = eventData.value as string;

    if (!videoId) {
      logger.warn("No video id found from event handler");
      return;
    }

    await IndexedDB.deleteVideoTagByVideoId(videoId);
    setRelationships((prev) => prev.filter((item) => item.video_id !== videoId));
  }, []);

  const fetchRelationships = useCallback(async () => {
    const allVideoTags = await IndexedDB.getAllVideoTags();
    setRelationships(allVideoTags);
  }, []);

  useEffect(() => {
    if (!isInitialized && isAppInitialized && isApplicationEnabled) {
      fetchRelationships();
      setIsInitialized(true);
    }
  }, [fetchRelationships, isApplicationEnabled, isAppInitialized, isInitialized]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  // handle VIDEO_TAG_ADD_RELATIONSHIP
  useEffect(() => {
    eventBus.subscribe(VIDEO_TAG_ADD_RELATIONSHIP, handleVideoTagAddRelationship);
    return () => {
      eventBus.unsubscribe(VIDEO_TAG_ADD_RELATIONSHIP, handleVideoTagAddRelationship);
    };
  }, [handleVideoTagAddRelationship]);

  // handle VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID
  useEffect(() => {
    eventBus.subscribe(VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID, handleVideoTagDeleteRelationshipByTagId);
    return () => {
      eventBus.unsubscribe(VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID, handleVideoTagDeleteRelationshipByTagId);
    };
  }, [handleVideoTagDeleteRelationshipByTagId]);

  // handle VIDEO_TAG_REMOVE_RELATIONSHIP_BY_VIDEO_ID
  useEffect(() => {
    eventBus.subscribe(VIDEO_TAG_REMOVE_RELATIONSHIP_BY_VIDEO_ID, handleVideoTagDeleteRelationshipByVideoId);
    return () => {
      eventBus.unsubscribe(VIDEO_TAG_REMOVE_RELATIONSHIP_BY_VIDEO_ID, handleVideoTagDeleteRelationshipByVideoId);
    };
  }, [handleVideoTagDeleteRelationshipByVideoId]);

  return (
    <VideoTagRelationshipContext.Provider value={{ videoTagRelationship: relationships, isInitialized: isInitialized }}>
      {children}
    </VideoTagRelationshipContext.Provider>
  );
};
