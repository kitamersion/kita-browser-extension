import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import { MyAnimeListAuth, MyAnimeListConfig } from "@/types/integrations/myanimelist";
import {
  getMyAnimeListAuth,
  getMyAnimeListConfig,
  setMyAnimeListAuthStatus,
  getMyAnimeListAuthStatus,
  getIsAuthorizedWithMyAnimeList,
  deleteMyAnimeListAuth,
  setMyAnimeListConfig,
  getMyAnimeListAutoSyncMedia,
} from "@/api/integration/myanimelist";
import eventBus from "@/api/eventbus";
import {
  INTEGRATION_MYANIMELIST_AUTH_CONNECT,
  INTEGRATION_MYANIMELIST_AUTH_DISCONNECT,
  INTEGRATION_MYANIMELIST_AUTH_POLL,
  INTEGRATION_MYANIMELIST_AUTH_START,
} from "@/data/events";
import { useToastContext } from "./toastNotificationContext";
import { AuthStatus } from "@/types/kitaschema";
import { useApplicationContext } from "./applicationContext";

interface MyAnimeListContextType {
  isInitialized: boolean;
  MyAnimeListConfig: MyAnimeListConfig;
  MyAnimeListAuth: MyAnimeListAuth;
  MyAnimeListAuthStatus: AuthStatus;
  MyAnimeListIsAuthorized: boolean;
  MyAnimeListAutoSyncMedia: boolean;
}

const initialMyAnimeListAuthState: MyAnimeListAuth = {
  access_token: "",
  refresh_token: "",
  token_type: "",
  expires_in: 0,
  issued_at: 0,
};

const initialMyAnimeListConfigState: MyAnimeListConfig = {
  myAnimeListId: "",
  secret: "",
  redirectUrl: "",
};

const POLLING_INTERVAL_MS = 5000; // 5 seconds

const MyAnimeListContext = createContext<MyAnimeListContextType | undefined>(undefined);

export const useMyAnimeListContext = () => {
  const context = useContext(MyAnimeListContext);
  if (!context) {
    throw new Error("useMyAnimeListContext must be used within a application provider");
  }
  return context;
};

export const MyAnimeListProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { isInitialized: isAppInitialized, isApplicationEnabled } = useApplicationContext();
  const { showToast } = useToastContext();
  const [myAnimeListAuth, setMyAnimeListAuthState] = useState<MyAnimeListAuth>(initialMyAnimeListAuthState);
  const [myAnimeListConfig, setMyAnimeListConfigState] = useState<MyAnimeListConfig>(initialMyAnimeListConfigState);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("initial");
  const [alreadyAuthorized, setAlreadyAuthorized] = useState<boolean>(false);
  const [MyAnimeListAutoSyncMedia, setMyAnimeListAutoSyncMedia] = useState<boolean>(false);

  const handleGetMyAnimeListAutoSync = useCallback(() => {
    getMyAnimeListAutoSyncMedia((state) => {
      setMyAnimeListAutoSyncMedia(state);
    });
  }, []);

  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const handleGetMyAnimeListAuthPolling = useCallback(() => {
    if (alreadyAuthorized) {
      stopPolling();
      showToast({
        title: "Existing Authorization found",
        status: "success",
      });
      setAuthStatus("authorized");
      return;
    }
    getMyAnimeListAuthStatus((status) => {
      if (!status) return;
      if (status === "initial") {
        return;
      }
      if (status === "pending") {
        setAuthStatus(status);
        showToast({
          title: "MyAnimeList authorization pending",
          status: "loading",
          duration: POLLING_INTERVAL_MS,
        });
      }
      if (status === "authorized") {
        setAuthStatus(status);
        stopPolling();
        showToast({
          title: "MyAnimeList authorization successful",
          status: "success",
        });
        // @todo remove reload when stats page is implemented
        setTimeout(() => {
          window.location.reload();
        }, POLLING_INTERVAL_MS);
      }
      if (status === "error") {
        setAuthStatus(status);
        stopPolling();
        showToast({
          title: "MyAnimeList authorization failed",
          status: "error",
        });
      }
    });
  }, [alreadyAuthorized, showToast, stopPolling]);

  useEffect(() => {
    if (!isPolling) {
      return;
    }

    const intervalId = setInterval(handleGetMyAnimeListAuthPolling, POLLING_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [handleGetMyAnimeListAuthPolling, isPolling]);

  const handleGetMyAnimeListAuth = useCallback(() => {
    getMyAnimeListAuth((data) => {
      if (!data) return;
      setMyAnimeListAuthState(data);
    });
  }, []);

  const handleGetMyAnimeListConfig = useCallback(() => {
    getMyAnimeListConfig((data) => {
      if (!data) return;
      setMyAnimeListConfigState(data);
    });
  }, []);

  const handleGetMyAnimeListAuthStatus = useCallback(() => {
    getIsAuthorizedWithMyAnimeList((hasAuthorization) => {
      setMyAnimeListAuthStatus(hasAuthorization, () => {
        if (hasAuthorization === "authorized") {
          setAlreadyAuthorized(true);
        }
        setAuthStatus(hasAuthorization);
      });
    });
  }, []);

  const handleStartAuthFlow = useCallback((eventData: any) => {
    const payload = eventData.value as MyAnimeListConfig;
    const jsonPayload = JSON.stringify(payload);
    setMyAnimeListAuthStatus("pending", () => {
      setMyAnimeListConfig(payload, () => {
        chrome.runtime.sendMessage({ type: INTEGRATION_MYANIMELIST_AUTH_CONNECT, payload: jsonPayload });
      });
    });
  }, []);

  const handleMyAnimeListDisconnect = useCallback(() => {
    deleteMyAnimeListAuth(() => {
      setMyAnimeListAuthStatus("initial", (status) => {
        setAuthStatus(status);
        showToast({
          title: "MyAnimeList authorization disconnected",
          status: "success",
        });
      });
    });

    setMyAnimeListConfig(
      {
        myAnimeListId: "",
        secret: "",
        redirectUrl: myAnimeListConfig.redirectUrl,
      },
      () => {}
    );
  }, [myAnimeListConfig, showToast]);

  useEffect(() => {
    if (!isInitialized && isAppInitialized && isApplicationEnabled) {
      handleGetMyAnimeListConfig();
      handleGetMyAnimeListAuth();
      handleGetMyAnimeListAuthStatus();
      handleGetMyAnimeListAutoSync();
      setIsInitialized(true);
      return () => {};
    }
  }, [
    handleGetMyAnimeListAuth,
    handleGetMyAnimeListAuthStatus,
    handleGetMyAnimeListAutoSync,
    handleGetMyAnimeListConfig,
    isAppInitialized,
    isApplicationEnabled,
    isInitialized,
  ]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  // handle INTEGRATION_MYANIMELIST_AUTH_START
  useEffect(() => {
    eventBus.subscribe(INTEGRATION_MYANIMELIST_AUTH_START, handleStartAuthFlow);
    return () => {
      eventBus.unsubscribe(INTEGRATION_MYANIMELIST_AUTH_START, handleStartAuthFlow);
    };
  }, [handleStartAuthFlow]);

  // handle INTEGRATION_MYANIMELIST_AUTH_DISCONNECT
  useEffect(() => {
    eventBus.subscribe(INTEGRATION_MYANIMELIST_AUTH_DISCONNECT, handleMyAnimeListDisconnect);
    return () => {
      eventBus.unsubscribe(INTEGRATION_MYANIMELIST_AUTH_DISCONNECT, handleMyAnimeListDisconnect);
    };
  }, [handleMyAnimeListDisconnect]);

  // handle INTEGRATION_MYANIMELIST_AUTH_POLL
  useEffect(() => {
    eventBus.subscribe(INTEGRATION_MYANIMELIST_AUTH_POLL, startPolling);
    return () => {
      eventBus.unsubscribe(INTEGRATION_MYANIMELIST_AUTH_POLL, startPolling);
    };
  }, [startPolling]);

  return (
    <MyAnimeListContext.Provider
      value={{
        isInitialized,
        MyAnimeListConfig: myAnimeListConfig,
        MyAnimeListAuth: myAnimeListAuth,
        MyAnimeListAuthStatus: authStatus,
        MyAnimeListIsAuthorized: alreadyAuthorized,
        MyAnimeListAutoSyncMedia: MyAnimeListAutoSyncMedia,
      }}
    >
      {children}
    </MyAnimeListContext.Provider>
  );
};
