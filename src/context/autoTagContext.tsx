import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import eventBus from "@/api/eventbus";
import { AUTO_TAG_ADD_OR_UPDATE, AUTO_TAG_DELETE_BY_ID } from "@/data/events";
import { useApplicationContext } from "./applicationContext";
import { IAutoTag } from "@/types/autotag";
import IndexedDB from "@/db/index";
import logger from "@/config/logger";

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
      console.log(autoTagToAdd);
      await IndexedDB.addAutoTag(autoTagToAdd);
      handleGetAutoTags();
    },
    [handleGetAutoTags]
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
