import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import eventBus from "@/api/eventbus";
import { AUTO_TAG_ADD_OR_UPDATE, AUTO_TAG_DELETE_BY_ID, TAG_DELETE_BY_ID } from "@/data/events";
import { useApplicationContext } from "./applicationContext";
import { IAutoTag } from "@/types/autotag";
import IndexedDB from "@/db/index";
import { logger } from "@kitamersion/kita-logging";
import { useToastContext } from "./toastNotificationContext";

type AutoTagContextType = {
  totalAutoTags: IAutoTag[];
  isInitialized: boolean;
};

const AutoTagContext = createContext<AutoTagContextType | undefined>(undefined);

export const useAutoTagContext = () => {
  const context = useContext(AutoTagContext);
  if (!context) {
    throw new Error("useAutoTagContext must be used within a video provider");
  }
  return context;
};

export const AutoTagProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { isInitialized: isAppInitialized, isApplicationEnabled } = useApplicationContext();
  const { showToast } = useToastContext();
  const [totalAutoTags, setTotalAutoTags] = useState<IAutoTag[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const handleGetAutoTags = useCallback(async () => {
    setIsInitialized(false);
    const allAutoTags = await IndexedDB.getAllAutoTags();
    setTotalAutoTags(allAutoTags);
    setIsInitialized(true);
  }, []);

  const handleAddOrUpdateAutoTag = useCallback(
    async (eventData: any) => {
      logger.debug(eventData.message);
      const autoTagToAdd = eventData.value as IAutoTag;
      if (!autoTagToAdd) {
        logger.warn("no auto tag to add");
        return;
      }
      logger.debug("auto tag added");
      await IndexedDB.addAutoTag(autoTagToAdd);
      handleGetAutoTags();

      showToast({
        title: "Auto tag saved",
        status: "success",
      });
    },
    [handleGetAutoTags, showToast]
  );

  const handleDeleteAutoTagById = useCallback(async (eventData: any) => {
    const autoTagId = eventData.value as string;
    if (!autoTagId) {
      logger.warn("no auto tag id to delete");
      return;
    }
    await IndexedDB.deleteAutoTagById(autoTagId);
    setTotalAutoTags((prev) => prev.filter((tag) => tag.id !== autoTagId));
  }, []);

  const handleTagDeletedCascadeRemoveFromAutoTag = useCallback(
    async (eventData: any) => {
      const id = eventData.value.id as string;
      if (!id) {
        logger.warn("No tag id found from event handler");
        return;
      }

      // from totalAutoTags find all autoTags that have the tag id from event to be removed
      const autoTags = totalAutoTags.filter((autoTag) => autoTag.tags.includes(id));

      // if there is a tagId we neeed to remove it from the auto tag and update the record
      if (autoTags.length === 0) {
        logger.info("Autotag cascade remove, tag is not found in any auto tag, skipping...");
        return;
      }

      // update the auto tag with the tag removed
      autoTags.forEach(async (autoTag) => {
        const updatedAutoTag = { ...autoTag, tags: autoTag.tags.filter((tagId) => tagId !== id) };
        await IndexedDB.addAutoTag(updatedAutoTag);
      });
      handleGetAutoTags();
    },
    [handleGetAutoTags, totalAutoTags]
  );

  useEffect(() => {
    if (!isInitialized && isAppInitialized && isApplicationEnabled) {
      handleGetAutoTags();
      setIsInitialized(true);
      return () => {};
    }
  }, [handleGetAutoTags, isAppInitialized, isApplicationEnabled, isInitialized]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  // handle AUTO_TAG_ADD_OR_UPDATE
  useEffect(() => {
    eventBus.subscribe(AUTO_TAG_ADD_OR_UPDATE, handleAddOrUpdateAutoTag);
    return () => {
      eventBus.unsubscribe(AUTO_TAG_ADD_OR_UPDATE, handleAddOrUpdateAutoTag);
    };
  }, [handleAddOrUpdateAutoTag]);

  // handle AUTO_TAG_DELETE_BY_ID
  useEffect(() => {
    eventBus.subscribe(AUTO_TAG_DELETE_BY_ID, handleDeleteAutoTagById);
    return () => {
      eventBus.unsubscribe(AUTO_TAG_DELETE_BY_ID, handleDeleteAutoTagById);
    };
  }, [handleDeleteAutoTagById]);

  // handle TAG_DELETE_BY_ID
  useEffect(() => {
    eventBus.subscribe(TAG_DELETE_BY_ID, handleTagDeletedCascadeRemoveFromAutoTag);
    return () => {
      eventBus.unsubscribe(TAG_DELETE_BY_ID, handleTagDeletedCascadeRemoveFromAutoTag);
    };
  }, [handleTagDeletedCascadeRemoveFromAutoTag]);

  return (
    <AutoTagContext.Provider
      value={{
        isInitialized: isInitialized,
        totalAutoTags: totalAutoTags,
      }}
    >
      {children}
    </AutoTagContext.Provider>
  );
};
