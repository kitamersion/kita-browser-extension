import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import { getApplicationEnabled, setApplicationEnabled } from "@/api/applicationStorage";
import { APPLICATION_ENABLE } from "@/data/events";
import eventBus from "@/api/eventbus";

const IS_APPLICATION_READY_MS = 1000; // 1 second
interface ApplicationContextType {
  isApplicationEnabled: boolean;
  isInitialized: boolean;
}

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

export const useApplicationContext = () => {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error("useApplicationContext must be used within a application provider");
  }
  return context;
};

export const ApplicationProvider = ({ children }: PropsWithChildren<unknown>) => {
  const [isAppEnabled, setIsAppEnabled] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const handleGetApplicationEnabledStatus = useCallback(() => {
    getApplicationEnabled((data) => {
      setIsAppEnabled(data);
      setIsInitialized(data);
    });
  }, []);

  const handleApplicationStatusChange = useCallback((eventData: any) => {
    setApplicationEnabled(eventData.value, (data) => {
      setIsAppEnabled(data);
    });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      handleGetApplicationEnabledStatus();
      if (isAppEnabled) {
        clearInterval(intervalId);
      }
    }, IS_APPLICATION_READY_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [handleGetApplicationEnabledStatus, isAppEnabled]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  // handle APPLICATION_ENABLE
  useEffect(() => {
    eventBus.subscribe(APPLICATION_ENABLE, handleApplicationStatusChange);
    return () => {
      eventBus.unsubscribe(APPLICATION_ENABLE, handleApplicationStatusChange);
    };
  }, [handleApplicationStatusChange]);

  return (
    <ApplicationContext.Provider value={{ isInitialized, isApplicationEnabled: isAppEnabled }}>{children}</ApplicationContext.Provider>
  );
};
