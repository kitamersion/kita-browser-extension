import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import eventBus from "@/api/eventbus";
import { AUTO_TAG_ADD, AUTO_TAG_DELETE_BY_ID } from "@/data/events";
import { useApplicationContext } from "./applicationContext";
import { IAutoTag } from "@/types/autotag";
import IndexedDB from "@/db/index";
import logger from "@/config/logger";

type AutoTagContextType = {
  totalAutoTags: IAutoTag[];
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

  const handleAddAutoTag = useCallback(async (eventData: any) => {
    const autoTagToAdd = eventData.value as IAutoTag;
    if (!autoTagToAdd) {
      logger.warn("No auto tag to add");
      return;
    }
    await IndexedDB.addAutoTag(autoTagToAdd);
    setTotalAutoTags((prev) => [...prev, autoTagToAdd]);
  }, []);

  const handleDeleteAutoTagById = useCallback(async (eventData: any) => {
    const autoTagId = eventData.value as string;
    if (!autoTagId) {
      logger.warn("No auto tag id to delete");
      return;
    }
    await IndexedDB.deleteAutoTagById(autoTagId);
    setTotalAutoTags((prev) => prev.filter((tag) => tag.id !== autoTagId));
  }, []);

  const handleGetAutoTags = useCallback(async () => {
    const allAutoTags = await IndexedDB.getAllAutoTags();
    setTotalAutoTags(allAutoTags);
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

  // handle AUTO_TAG_ADD
  useEffect(() => {
    eventBus.subscribe(AUTO_TAG_ADD, handleAddAutoTag);
    return () => {
      eventBus.unsubscribe(AUTO_TAG_ADD, handleAddAutoTag);
    };
  }, [handleAddAutoTag]);

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
        totalAutoTags: totalAutoTags,
      }}
    >
      {children}
    </AutoTagContext.Provider>
  );
};
