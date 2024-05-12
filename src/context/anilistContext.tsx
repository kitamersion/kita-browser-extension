import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";
import {
  getAnilistAuth,
  getAnilistConfig,
  setAnilistAuthStatus,
  getAnilistAuthStatus,
  getIsAuthorizedWithAnilist,
  deleteAnilistAuth,
  setAnilistConfig,
} from "@/api/integration/anilist";
import eventBus from "@/api/eventbus";
import {
  INTEGRATION_ANILIST_AUTH_CONNECT,
  INTEGRATION_ANILIST_AUTH_DISCONNECT,
  INTEGRATION_ANILIST_AUTH_POLL,
  INTEGRATION_ANILIST_AUTH_START,
} from "@/data/events";
import { useToastContext } from "./toastNotificationContext";
import { AuthStatus } from "@/types/kitaschema";
import { useApplicationContext } from "./applicationContext";

interface AnilistContextType {
  isInitialized: boolean;
  anilistConfig: AnilistConfig;
  anilistAuth: AnilistAuth;
  anilistAuthStatus: AuthStatus;
  anilistIsAuthorized: boolean;
}

const initialAnilistAuthState: AnilistAuth = {
  access_token: "",
  token_type: "",
  expires_in: 0,
};

const initialAnilistConfigState: AnilistConfig = {
  anilistId: "",
  secret: "",
  redirectUrl: "",
};

const POLLING_INTERVAL_MS = 1000; // 1 second

const AnilistContext = createContext<AnilistContextType | undefined>(undefined);

export const useAnilistContext = () => {
  const context = useContext(AnilistContext);
  if (!context) {
    throw new Error("useAnilistContext must be used within a application provider");
  }
  return context;
};

export const AnilistProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { isInitialized: isAppInitialized, isApplicationEnabled } = useApplicationContext();
  const { showToast } = useToastContext();
  const [anilistAuth, setAnilistAuthState] = useState<AnilistAuth>(initialAnilistAuthState);
  const [anilistConfig, setAnilistConfigState] = useState<AnilistConfig>(initialAnilistConfigState);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("initial");
  const [alreadyAuthorized, setAlreadyAuthorized] = useState<boolean>(false);

  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const handleGetAnilistAuthPolling = useCallback(() => {
    if (alreadyAuthorized) {
      stopPolling();
      showToast({
        title: "Existing Authorization found",
        status: "success",
      });
      setAuthStatus("authorized");
      return;
    }
    getAnilistAuthStatus((status) => {
      if (!status) return;
      if (status === "initial") {
        return;
      }
      if (status === "pending") {
        setAuthStatus(status);
        showToast({
          title: "Anilist authorization pending",
          status: "loading",
          duration: POLLING_INTERVAL_MS,
        });
      }
      if (status === "authorized") {
        setAuthStatus(status);
        stopPolling();
        showToast({
          title: "Anilist authorization successful",
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
          title: "Anilist authorization failed",
          status: "error",
        });
      }
    });
  }, [alreadyAuthorized, showToast, stopPolling]);

  useEffect(() => {
    if (!isPolling) {
      return;
    }

    const intervalId = setInterval(handleGetAnilistAuthPolling, POLLING_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [handleGetAnilistAuthPolling, isPolling]);

  const handleGetAnilistAuth = useCallback(() => {
    getAnilistAuth((data) => {
      if (!data) return;
      setAnilistAuthState(data);
    });
  }, []);

  const handleGetAnilistConfig = useCallback(() => {
    getAnilistConfig((data) => {
      if (!data) return;
      setAnilistConfigState(data);
    });
  }, []);

  const handleGetAnilistAuthStatus = useCallback(() => {
    getIsAuthorizedWithAnilist((hasAuthorization) => {
      setAnilistAuthStatus(hasAuthorization, () => {
        if (hasAuthorization === "authorized") {
          setAlreadyAuthorized(true);
        }
        setAuthStatus(hasAuthorization);
      });
    });
  }, []);

  const handleStartAuthFlow = useCallback((eventData: any) => {
    const payload = eventData.value as AnilistConfig;
    const jsonPayload = JSON.stringify(payload);
    setAnilistAuthStatus("pending", () => {
      setAnilistConfig(payload, () => {
        chrome.runtime.sendMessage({ type: INTEGRATION_ANILIST_AUTH_CONNECT, payload: jsonPayload });
      });
    });
  }, []);

  const handleAnilistDisconnect = useCallback(() => {
    deleteAnilistAuth(() => {
      setAnilistAuthStatus("initial", (status) => {
        setAuthStatus(status);
        showToast({
          title: "Anilist authorization disconnected",
          status: "success",
        });
      });
    });
  }, [showToast]);

  useEffect(() => {
    if (!isInitialized && isAppInitialized && isApplicationEnabled) {
      handleGetAnilistConfig();
      handleGetAnilistAuth();
      handleGetAnilistAuthStatus();
      setIsInitialized(true);
      return () => {};
    }
  }, [handleGetAnilistAuth, handleGetAnilistAuthStatus, handleGetAnilistConfig, isAppInitialized, isApplicationEnabled, isInitialized]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  // handle INTEGRATION_ANILIST_AUTH_START
  useEffect(() => {
    eventBus.subscribe(INTEGRATION_ANILIST_AUTH_START, handleStartAuthFlow);
    return () => {
      eventBus.unsubscribe(INTEGRATION_ANILIST_AUTH_START, handleStartAuthFlow);
    };
  }, [handleStartAuthFlow]);

  // handle INTEGRATION_ANILIST_AUTH_DISCONNECT
  useEffect(() => {
    eventBus.subscribe(INTEGRATION_ANILIST_AUTH_DISCONNECT, handleAnilistDisconnect);
    return () => {
      eventBus.unsubscribe(INTEGRATION_ANILIST_AUTH_DISCONNECT, handleAnilistDisconnect);
    };
  }, [handleAnilistDisconnect]);

  // handle INTEGRATION_ANILIST_AUTH_POLL
  useEffect(() => {
    eventBus.subscribe(INTEGRATION_ANILIST_AUTH_POLL, startPolling);
    return () => {
      eventBus.unsubscribe(INTEGRATION_ANILIST_AUTH_POLL, startPolling);
    };
  }, [startPolling]);

  return (
    <AnilistContext.Provider
      value={{ isInitialized, anilistConfig, anilistAuth, anilistAuthStatus: authStatus, anilistIsAuthorized: alreadyAuthorized }}
    >
      {children}
    </AnilistContext.Provider>
  );
};
