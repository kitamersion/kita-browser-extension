import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import { getApplicationEnabled, setContentScriptEnabled } from "@/api/applicationStorage";
import { CONTENT_SCRIPT_ENABLE } from "@/data/events";
import eventBus from "@/api/eventbus";

const IS_APPLICATION_READY_MS = 250; // 1/4 second
interface ApplicationContextType {
  isApplicationEnabled: boolean;
  isContentScriptEnabled: boolean;
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
  const [isContentScriptEnabled, setIsContentScriptEnabled] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const handleGetApplicationEnabledStatus = useCallback(() => {
    getApplicationEnabled((data) => {
      setIsAppEnabled(data);
      setIsInitialized(data);
    });
  }, []);

  const handleContentScriptStatusChange = useCallback((eventData: any) => {
    setContentScriptEnabled(eventData.value, (data) => {
      setIsAppEnabled(data);
      setIsContentScriptEnabled(data);
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

  // handle CONTENT_SCRIPT_ENABLE
  useEffect(() => {
    eventBus.subscribe(CONTENT_SCRIPT_ENABLE, handleContentScriptStatusChange);
    return () => {
      eventBus.unsubscribe(CONTENT_SCRIPT_ENABLE, handleContentScriptStatusChange);
    };
  }, [handleContentScriptStatusChange]);

  return (
    <ApplicationContext.Provider
      value={{ isInitialized, isApplicationEnabled: isAppEnabled, isContentScriptEnabled: isContentScriptEnabled }}
    >
      {children}
    </ApplicationContext.Provider>
  );
};
