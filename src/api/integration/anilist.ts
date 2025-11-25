import { logger } from "@kitamersion/kita-logging";
import { SETTINGS } from "@/api/settings";
import { Callback } from "@/types/callback";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";
import { AuthStatus } from "@/types/kitaschema";

const ANILIST_CONFIG_KEY = SETTINGS.integrations.anilist.configKey.key;
const ANILIST_AUTH_KEY = SETTINGS.integrations.anilist.authKey.key;
const ANILIST_AUTH_STATE_KEY = SETTINGS.integrations.anilist.authStatus.key;
const ANILIST_AUTO_SYNC_MEDIA_KEY = SETTINGS.integrations.anilist.autoSync.key;

// get anilist config
const getAnilistConfig = async (callback: Callback<AnilistConfig | null>) => {
  chrome.storage.local.get(ANILIST_CONFIG_KEY, (data) => {
    const anilist = data?.[ANILIST_CONFIG_KEY] || null;
    callback(anilist);
  });
};

// set anilist config
const setAnilistConfig = async (anilist: AnilistConfig, callback: Callback<AnilistConfig>) => {
  chrome.storage.local.set({ [ANILIST_CONFIG_KEY]: anilist }, () => {
    logger.info("setting anilist config");
    callback(anilist);
  });
};

// delete anilist config
const deleteAnilistConfig = async (callback: Callback<void>) => {
  logger.info("deleting anilist config");

  chrome.storage.local.remove(ANILIST_CONFIG_KEY, () => {
    logger.info("deleting anilist config");
    callback();
  });
};

// get anilist auth
const getAnilistAuth = async (callback: Callback<AnilistAuth | null>) => {
  logger.info("fetching anilist auth");

  // Check for token in environment first (for development)
  const envToken = process.env.ANILIST_ACCESS_TOKEN;
  if (envToken) {
    logger.info("using anilist token from environment");
    callback({
      access_token: envToken,
      token_type: "Bearer",
      expires_in: 31536000, // 1 year
      issued_at: Date.now(),
    });
    return;
  }

  chrome.storage.local.get(ANILIST_AUTH_KEY, (data) => {
    logger.info("fetching anilist auth");
    const anilist = data?.[ANILIST_AUTH_KEY] || null;
    callback(anilist);
  });
};

// set anilist auth
const setAnilistAuth = async (anilist: AnilistAuth, callback: Callback<AnilistAuth>) => {
  logger.info("setting anilist auth");

  chrome.storage.local.set({ [ANILIST_AUTH_KEY]: anilist }, () => {
    logger.info("setting anilist auth");
    callback(anilist);
  });
};

// delete anilist auth
const deleteAnilistAuth = async (callback: Callback<void>) => {
  logger.info("deleting anilist auth");

  chrome.storage.local.remove(ANILIST_AUTH_KEY, () => {
    logger.info("deleting anilist auth");
    callback();
  });
};

// get anilist auth status
const getAnilistAuthStatus = async (callback: Callback<AuthStatus | null>) => {
  logger.info("fetching anilist auth state");

  // If we have an env token, consider it authorized
  const envToken = process.env.ANILIST_ACCESS_TOKEN;
  if (envToken) {
    logger.info("using authorized status from environment token");
    callback("authorized");
    return;
  }

  chrome.storage.local.get(ANILIST_AUTH_STATE_KEY, (data) => {
    logger.info("fetching anilist auth state");
    const state = data?.[ANILIST_AUTH_STATE_KEY] || null;
    callback(state);
  });
};

// set anilist auth status
const setAnilistAuthStatus = async (status: AuthStatus, callback: Callback<AuthStatus>) => {
  logger.info("setting anilist auth status");

  chrome.storage.local.set({ [ANILIST_AUTH_STATE_KEY]: status }, () => {
    logger.info("setting anilist auth state");
    callback(status);
  });
};

// delete anilist auth status
const deleteAnilistAuthStatus = async (callback: Callback<void>) => {
  logger.info("deleting anilist auth status");

  chrome.storage.local.remove(ANILIST_AUTH_STATE_KEY, () => {
    logger.info("deleting anilist auth status");
    callback();
  });
};

// get ANILIST_AUTO_SYNC_MEDIA_KEY
const getAnilistAutoSyncMedia = async (callback: Callback<boolean>) => {
  chrome.storage.local.get(ANILIST_AUTO_SYNC_MEDIA_KEY, (data) => {
    const state = data?.[ANILIST_AUTO_SYNC_MEDIA_KEY] ?? false;
    callback(state);
  });
};

// set ANILIST_AUTO_SYNC_MEDIA_KEY
const setAnilistAutoSyncMedia = async (value: boolean, callback: Callback<boolean>) => {
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
