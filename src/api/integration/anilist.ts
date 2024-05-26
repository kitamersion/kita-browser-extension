import logger from "@/config/logger";
import { kitaSchema } from "@/data/kitaschema";
import { Callback } from "@/types/callback";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";
import { AuthStatus } from "@/types/kitaschema";

const ENV = process.env.APPLICATION_ENVIRONMENT;
const ANILIST_CONFIG_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistConfigKey;
const ANILIST_AUTH_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistAuthKey;
const ANILIST_AUTH_STATE_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AuthStatus;
const ANILIST_AUTO_SYNC_MEDIA_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistAutoSyncMediaKey;

// get anlist config
const getAnilistConfig = (callback: Callback<AnilistConfig | null>) => {
  if (ENV === "dev") {
    logger.info("fetching anilist config");
    const anilist = localStorage.getItem(ANILIST_CONFIG_KEY);
    if (!anilist) {
      callback({ anilistId: "", secret: "", redirectUrl: window.location.origin });
      return;
    }
    callback(JSON.parse(anilist));
    return;
  }

  chrome.storage.local.get(ANILIST_CONFIG_KEY, (data) => {
    const anilist = data?.[ANILIST_CONFIG_KEY] || null;
    callback(anilist);
  });
};

// set anilist config
const setAnilistConfig = (anilist: AnilistConfig, callback: Callback<AnilistConfig>) => {
  if (ENV === "dev") {
    logger.info("setting anilist config");
    localStorage.setItem(ANILIST_CONFIG_KEY, JSON.stringify(anilist));
    callback(anilist);
    return;
  }

  chrome.storage.local.set({ [ANILIST_CONFIG_KEY]: anilist }, () => {
    logger.info("setting anilist config");
    callback(anilist);
  });
};

// delete anilist config
const deleteAnilistConfig = (callback: Callback<void>) => {
  if (ENV === "dev") {
    logger.info("deleting anilist config");
    localStorage.removeItem(ANILIST_CONFIG_KEY);
    callback();
    return;
  }

  chrome.storage.local.remove(ANILIST_CONFIG_KEY, () => {
    logger.info("deleting anilist config");
    callback();
  });
};

// get anilist auth
const getAnilistAuth = (callback: Callback<AnilistAuth | null>) => {
  if (ENV === "dev") {
    logger.info("fetching anilist auth");
    const anilist = localStorage.getItem(ANILIST_AUTH_KEY);
    if (!anilist) {
      callback(null);
      return;
    }
    callback(JSON.parse(anilist));
    return;
  }

  chrome.storage.local.get(ANILIST_AUTH_KEY, (data) => {
    logger.info("fetching anilist auth");
    const anilist = data?.[ANILIST_AUTH_KEY] || null;
    callback(anilist);
  });
};

// set anilist auth
const setAnilistAuth = (anilist: AnilistAuth, callback: Callback<AnilistAuth>) => {
  if (ENV === "dev") {
    logger.info("setting anilist auth");
    localStorage.setItem(ANILIST_AUTH_KEY, JSON.stringify(anilist));
    callback(anilist);
    return;
  }

  chrome.storage.local.set({ [ANILIST_AUTH_KEY]: anilist }, () => {
    logger.info("setting anilist auth");
    callback(anilist);
  });
};

// delete anilist auth
const deleteAnilistAuth = (callback: Callback<void>) => {
  if (ENV === "dev") {
    logger.info("deleting anilist auth");
    localStorage.removeItem(ANILIST_AUTH_KEY);
    callback();
    return;
  }

  chrome.storage.local.remove(ANILIST_AUTH_KEY, () => {
    logger.info("deleting anilist auth");
    callback();
  });
};

// get anilist auth status
const getAnilistAuthStatus = (callback: Callback<AuthStatus | null>) => {
  if (ENV === "dev") {
    logger.info("fetching anilist auth state");
    const state = localStorage.getItem(ANILIST_AUTH_STATE_KEY);
    if (!state) {
      callback(null);
      return;
    }
    callback(state as AuthStatus);
    return;
  }

  chrome.storage.local.get(ANILIST_AUTH_STATE_KEY, (data) => {
    logger.info("fetching anilist auth state");
    const state = data?.[ANILIST_AUTH_STATE_KEY] || null;
    callback(state);
  });
};

// set anilist auth status
const setAnilistAuthStatus = (status: AuthStatus, callback: Callback<AuthStatus>) => {
  if (ENV === "dev") {
    logger.info("setting anilist auth status");
    localStorage.setItem(ANILIST_AUTH_STATE_KEY, status);
    callback(status);
    return;
  }

  chrome.storage.local.set({ [ANILIST_AUTH_STATE_KEY]: status }, () => {
    logger.info("setting anilist auth state");
    callback(status);
  });
};

// delete anilist auth status
const deleteAnilistAuthStatus = (callback: Callback<void>) => {
  if (ENV === "dev") {
    logger.info("deleting anilist auth status");
    localStorage.removeItem(ANILIST_AUTH_STATE_KEY);
    callback();
    return;
  }

  chrome.storage.local.remove(ANILIST_AUTH_STATE_KEY, () => {
    logger.info("deleting anilist auth status");
    callback();
  });
};

// get ANILIST_AUTO_SYNC_MEDIA_KEY
const getAnilistAutoSyncMedia = (callback: Callback<boolean>) => {
  if (ENV === "dev") {
    logger.info("fetching anilist auto sync media");
    const syncState = localStorage.getItem(ANILIST_AUTO_SYNC_MEDIA_KEY);
    if (syncState === null) {
      callback(false);
      return;
    }
    callback(syncState as unknown as boolean);
    return;
  }

  chrome.storage.local.get(ANILIST_AUTO_SYNC_MEDIA_KEY, (data) => {
    logger.info("fetching anilist auto sync media");
    const state = data?.[ANILIST_AUTO_SYNC_MEDIA_KEY] || false;
    callback(state);
  });
};

// set ANILIST_AUTO_SYNC_MEDIA_KEY
const setAnilistAutoSyncMedia = (value: boolean, callback: Callback<boolean>) => {
  if (ENV === "dev") {
    logger.info(`setting anilist auto sync media to: ${value}`);
    localStorage.setItem(ANILIST_AUTO_SYNC_MEDIA_KEY, value.toString());
    callback(value);
    return;
  }

  chrome.storage.local.set({ [ANILIST_AUTO_SYNC_MEDIA_KEY]: value }, () => {
    logger.info(`setting anilist auto sync media to: ${value}`);
    callback(value);
  });
};

const getIsAuthorizedWithAnilist = (callback: Callback<AuthStatus>) => {
  getAnilistAuth((data) => {
    if (!data) {
      logger.info("no anilist auth data");
      callback("initial");
      return;
    }
    if (!data?.access_token) {
      logger.info("no access token");
      callback("initial");
      return;
    }

    if (!data?.issued_at) {
      logger.info("no issued_at");
      callback("unauthorized");
      return;
    }

    const nowInSeconds = Date.now() / 1000;
    const issuedInSeconds = data?.issued_at / 1000;
    if (nowInSeconds > issuedInSeconds + data?.expires_in) {
      logger.info("access token expired");
      callback("unauthorized");
      return;
    }
    logger.info("authorized with anilist");
    callback("authorized");
  });
};

// get auth url
const getAnilistAuthUrl = (anilistId: string): string => {
  return `https://anilist.co/api/v2/oauth/authorize?client_id=${anilistId}&response_type=token`;
};

export {
  getAnilistAuthUrl,
  getAnilistConfig,
  setAnilistConfig,
  deleteAnilistConfig,
  getAnilistAuth,
  setAnilistAuth,
  deleteAnilistAuth,
  getAnilistAuthStatus,
  setAnilistAuthStatus,
  deleteAnilistAuthStatus,
  getIsAuthorizedWithAnilist,
  getAnilistAutoSyncMedia,
  setAnilistAutoSyncMedia,
};
