import React, { createContext, useState, useEffect, useCallback, PropsWithChildren, useContext } from "react";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";
import { getAnilistAuth, getAnilistConfig } from "@/api/integration/anilist";

interface AnilistContextType {
  isInitialized: boolean;
  anilistConfig: AnilistConfig;
  anilistAuth: AnilistAuth;
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

const AnilistContext = createContext<AnilistContextType | undefined>(undefined);

export const useAnilistContext = () => {
  const context = useContext(AnilistContext);
  if (!context) {
    throw new Error("useAnilistContext must be used within a application provider");
  }
  return context;
};

export const AnilistProvider = ({ children }: PropsWithChildren<unknown>) => {
  const [anilistAuth, setAnilistAuth] = useState<AnilistAuth>(initialAnilistAuthState);
  const [anilistConfig, setAnilistConfig] = useState<AnilistConfig>(initialAnilistConfigState);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const handleGetAnilistAuth = useCallback(() => {
    getAnilistAuth((data) => {
      if (!data) return;
      setAnilistAuth(data);
    });
  }, []);

  const handleGetAnilistConfig = useCallback(() => {
    getAnilistConfig((data) => {
      if (!data) return;
      setAnilistConfig(data);
    });
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      handleGetAnilistConfig();
      handleGetAnilistAuth();

      console.log("Anilist context initialized");
      console.log("Anilist config", anilistConfig);
      console.log("Anilist auth", anilistAuth);
      setIsInitialized(true);
      return () => {};
    }
  }, [anilistAuth, anilistConfig, handleGetAnilistAuth, handleGetAnilistConfig, isInitialized]);

  // ================================================================================
  // ======================     EVENT HANDLERS      =================================
  // ================================================================================

  return <AnilistContext.Provider value={{ isInitialized, anilistConfig, anilistAuth }}>{children}</AnilistContext.Provider>;
};
