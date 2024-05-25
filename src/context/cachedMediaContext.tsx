import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import eventBus from "@/api/eventbus";
import { IMediaCache } from "@/types/integrations/cache";
import IndexedDB from "@/db/index";
import { CACHED_MEDIA_METADATA_ADD_OR_UPDATE, CACHED_MEDIA_METADATA_DELETE } from "@/data/events";
import { useApplicationContext } from "./applicationContext";

interface CachedMediaContextType {
  isInitialized: boolean;
  mediaCaches: IMediaCache[];
}

const CachedMediaContext = createContext<CachedMediaContextType | undefined>(undefined);

export const useCachedMediaContext = () => {
  const context = useContext(CachedMediaContext);
  if (!context) {
    throw new Error("usCachedMediaContext must be used within a application provider");
  }
  return context;
};

export const CachedMediaProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { isInitialized: isAppInitialized, isApplicationEnabled } = useApplicationContext();
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [mediaCaches, setMediaCaches] = useState<IMediaCache[]>([]);

  const handleGetAllCachedMedia = useCallback(async () => {
    // delete expired cache
    await IndexedDB.deleteExpiredMediaCache();

    const mediaCaches = await IndexedDB.getAllMediaCache();
    setMediaCaches(mediaCaches ?? []);
  }, []);

  const handleCacheMediaAddOrUpdate = useCallback(async (eventData: any) => {
    const payload = eventData.value as IMediaCache;

    console.log("handle new cache item add from context");
    console.log(payload);

    await IndexedDB.addOrUpdateMediaCache(payload);
    console.log("done");
  }, []);

  const handleCacheMediaDeleteById = useCallback(async (eventData: any) => {
    const payload = eventData.value;

    await IndexedDB.deleteMediaCacheById(payload);
  }, []);

  useEffect(() => {
    if (!isInitialized && isAppInitialized) {
      handleGetAllCachedMedia();
      setIsInitialized(true);
      return () => {};
    }
  }, [handleGetAllCachedMedia, isAppInitialized, isApplicationEnabled, isInitialized]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  // handle CACHED_MEDIA_METADATA_ADD_OR_UPDATE
  useEffect(() => {
    eventBus.subscribe(CACHED_MEDIA_METADATA_ADD_OR_UPDATE, handleCacheMediaAddOrUpdate);
    return () => {
      eventBus.unsubscribe(CACHED_MEDIA_METADATA_ADD_OR_UPDATE, handleCacheMediaAddOrUpdate);
    };
  }, [handleCacheMediaAddOrUpdate]);

  // handle CACHED_MEDIA_METADATA_DELETE
  useEffect(() => {
    eventBus.subscribe(CACHED_MEDIA_METADATA_DELETE, handleCacheMediaDeleteById);
    return () => {
      eventBus.unsubscribe(CACHED_MEDIA_METADATA_DELETE, handleCacheMediaDeleteById);
    };
  }, [handleCacheMediaDeleteById]);

  return <CachedMediaContext.Provider value={{ isInitialized, mediaCaches: mediaCaches }}>{children}</CachedMediaContext.Provider>;
};
