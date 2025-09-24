import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import eventBus from "@/api/eventbus";
import { ITag } from "@/types/tag";
import { TAG_DELETE_BY_ID, TAG_DELETE_ALL, TAG_SET } from "@/data/events";
import { useToastContext } from "./toastNotificationContext";
import IndexedDB from "@/db/index";
import { decrementTotalTags, incrementTotalTags } from "@/api/summaryStorage/tag";
import { useApplicationContext } from "./applicationContext";
import { logger } from "@kitamersion/kita-logging";

type TagContextType = { tags: ITag[]; totalTagCount: number; isInitialized: boolean };

const TagContext = createContext<TagContextType | undefined>(undefined);

export const useTagContext = () => {
  const context = useContext(TagContext);
  if (!context) {
    throw new Error("useTagContext must be used within a tag provider");
  }
  return context;
};

export const TagProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { isInitialized: isAppInitialized, isApplicationEnabled } = useApplicationContext();
  const { showToast } = useToastContext();
  const [tags, setTags] = useState<ITag[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [totalTagCount, setTotalTagCount] = useState<number>(0);

  const handleGetTags = useCallback(async () => {
    const allTags = await IndexedDB.getAllTags();
    setTags(allTags);

    setTotalTagCount(allTags.length);
  }, []);

  const handleDeleteAllTags = useCallback(async () => {
    // @todo cascade remove tags from videos
    showToast({ title: "Tags deleted", status: "success" });
  }, [showToast]);

  const handleDeleteById = useCallback(
    async (eventData: any) => {
      const id = eventData.value.id as string;
      if (!id) {
        await logger.warn("No tag id found from event handler");
        return;
      }

      await IndexedDB.deleteTagById(id);
      await IndexedDB.deleteVideoTagByTagId(id);
      decrementTotalTags();
      await handleGetTags();
      showToast({ title: "Tag deleted", status: "success" });
    },
    [handleGetTags, showToast]
  );

  const handleSetTag = useCallback(
    async (eventData: any) => {
      const name = eventData.value.name as string;
      if (!name) {
        await logger.warn("Empty or null tag name");
        return;
      }

      await IndexedDB.addTag({ name: name });
      incrementTotalTags();
      await handleGetTags();
      showToast({ title: "Tag added", status: "success" });
    },
    [handleGetTags, showToast]
  );

  useEffect(() => {
    if (!isInitialized && isAppInitialized && isApplicationEnabled) {
      handleGetTags();
      setIsInitialized(true);
      return () => {};
    }
  }, [handleGetTags, isAppInitialized, isApplicationEnabled, isInitialized]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  // handle TAG_DELETE_BY_ID
  useEffect(() => {
    eventBus.subscribe(TAG_DELETE_BY_ID, handleDeleteById);
    return () => {
      eventBus.unsubscribe(TAG_DELETE_BY_ID, handleDeleteById);
    };
  }, [handleDeleteById]);

  // handle TAG_DELETE_ALL
  useEffect(() => {
    eventBus.subscribe(TAG_DELETE_ALL, handleDeleteAllTags);
    return () => {
      eventBus.unsubscribe(TAG_DELETE_ALL, handleDeleteAllTags);
    };
  }, [handleDeleteAllTags]);

  // handle TAG_SET
  useEffect(() => {
    eventBus.subscribe(TAG_SET, handleSetTag);
    return () => {
      eventBus.unsubscribe(TAG_SET, handleSetTag);
    };
  }, [handleSetTag]);

  return <TagContext.Provider value={{ tags, totalTagCount, isInitialized }}>{children}</TagContext.Provider>;
};
