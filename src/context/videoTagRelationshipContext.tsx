import React, { createContext, useEffect, PropsWithChildren, useContext, useCallback } from "react";
import {
  VIDEO_TAG_ADD_RELATIONSHIP,
  VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID,
  VIDEO_TAG_REMOVE_RELATIONSHIP_BY_VIDEO_ID,
} from "@/data/events";
import eventBus from "@/api/eventbus";
import { IVideoTag } from "@/types/relationship";
import IndexedDB from "@/db/index";

const VideoTagRelationshipContext = createContext<undefined>(undefined);

export const useVideoTagRelationshipContext = () => {
  const context = useContext(VideoTagRelationshipContext);
  if (!context) {
    throw new Error("useVideoTagRelationshipContext must be used within a application provider");
  }
  return context;
};

export const VideoTagRelationshipProvider = ({ children }: PropsWithChildren<unknown>) => {
  const handleVideoTagAddRelationship = useCallback((eventData: any) => {
    const videoTagRelationship = eventData.value as IVideoTag[];
    console.log("Received VIDEO_TAG_ADD_RELATIONSHIP with payload:", videoTagRelationship);

    if (!videoTagRelationship || videoTagRelationship.length === 0) {
      console.warn("No video tag relationship found from event handler");
      return;
    }

    // for earch items in videoTagRelationship, add to indexedDB
    videoTagRelationship.forEach(async (videoTagRelationship) => {
      await IndexedDB.addVideoTag(videoTagRelationship);
    });
  }, []);

  const handleVideoTagDeleteRelationshipByTagId = useCallback(async (eventData: any) => {
    const tagId = eventData.value as string;
    console.log("Received VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID with payload:", tagId);

    if (!tagId) {
      console.warn("No tag id found from event handler");
      return;
    }

    await IndexedDB.deleteVideoTagByTagId(tagId);
  }, []);

  const handleVideoTagDeleteRelationshipByVideoId = useCallback(async (eventData: any) => {
    const videoId = eventData.value as string;
    console.log("Received VIDEO_TAG_REMOVE_RELATIONSHIP_BY_VIDEO_ID with payload:", videoId);

    if (!videoId) {
      console.warn("No video id found from event handler");
      return;
    }

    await IndexedDB.deleteVideoTagByVideoId(videoId);
  }, []);

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
  }, [handleVideoTagDeleteRelationshipByTagId]);

  return <VideoTagRelationshipContext.Provider value={undefined}>{children}</VideoTagRelationshipContext.Provider>;
};
