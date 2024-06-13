import logger from "@/config/logger";
import { kitaSchema } from "@/data/kitaschema";
import { Callback } from "@/types/callback";
import { MyAnimeListAuth, MyAnimeListConfig } from "@/types/integrations/myanimelist";
import { AuthStatus } from "@/types/kitaschema";

const ENV = process.env.APPLICATION_ENVIRONMENT;
const MYANIMELIST_CONFIG_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.MyAnimeListKeys.MyAnimeListConfigKey;
const MYANIMELIST_AUTH_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.MyAnimeListKeys.MyAnimeListAuthKey;
const MYANIMELIST_AUTH_STATE_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.MyAnimeListKeys.AuthStatus;
const MYANIMELIST_AUTO_SYNC_MEDIA_KEY =
  kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.MyAnimeListKeys.MyAnimeListAutoSyncMediaKey;

// get anlist config
const getMyAnimeListConfig = (callback: Callback<MyAnimeListConfig | null>) => {
  if (ENV === "dev") {
    logger.info("fetching MyAnimeList config");
    const MyAnimeList = localStorage.getItem(MYANIMELIST_CONFIG_KEY);
    if (!MyAnimeList) {
      callback({ MyAnimeListId: "", secret: "", redirectUrl: window.location.origin });
      return;
    }
    callback(JSON.parse(MyAnimeList));
    return;
  }

  chrome.storage.local.get(MYANIMELIST_CONFIG_KEY, (data) => {
    const MyAnimeList = data?.[MYANIMELIST_CONFIG_KEY] || null;
    callback(MyAnimeList);
  });
};

// set MyAnimeList config
const setMyAnimeListConfig = (MyAnimeList: MyAnimeListConfig, callback: Callback<MyAnimeListConfig>) => {
  if (ENV === "dev") {
    logger.info("setting MyAnimeList config");
    localStorage.setItem(MYANIMELIST_CONFIG_KEY, JSON.stringify(MyAnimeList));
    callback(MyAnimeList);
    return;
  }

  chrome.storage.local.set({ [MYANIMELIST_CONFIG_KEY]: MyAnimeList }, () => {
    logger.info("setting MyAnimeList config");
    callback(MyAnimeList);
  });
};

// delete MyAnimeList config
const deleteMyAnimeListConfig = (callback: Callback<void>) => {
  if (ENV === "dev") {
    logger.info("deleting MyAnimeList config");
    localStorage.removeItem(MYANIMELIST_CONFIG_KEY);
    callback();
    return;
  }

  chrome.storage.local.remove(MYANIMELIST_CONFIG_KEY, () => {
    logger.info("deleting MyAnimeList config");
    callback();
  });
};

// get MyAnimeList auth
const getMyAnimeListAuth = (callback: Callback<MyAnimeListAuth | null>) => {
  if (ENV === "dev") {
    logger.info("fetching MyAnimeList auth");
    const MyAnimeList = localStorage.getItem(MYANIMELIST_AUTH_KEY);
    if (!MyAnimeList) {
      callback(null);
      return;
    }
    callback(JSON.parse(MyAnimeList));
    return;
  }

  chrome.storage.local.get(MYANIMELIST_AUTH_KEY, (data) => {
    logger.info("fetching MyAnimeList auth");
    const MyAnimeList = data?.[MYANIMELIST_AUTH_KEY] || null;
    callback(MyAnimeList);
  });
};

// set MyAnimeList auth
const setMyAnimeListAuth = (MyAnimeList: MyAnimeListAuth, callback: Callback<MyAnimeListAuth>) => {
  if (ENV === "dev") {
    logger.info("setting MyAnimeList auth");
    localStorage.setItem(MYANIMELIST_AUTH_KEY, JSON.stringify(MyAnimeList));
    callback(MyAnimeList);
    return;
  }

  chrome.storage.local.set({ [MYANIMELIST_AUTH_KEY]: MyAnimeList }, () => {
    logger.info("setting MyAnimeList auth");
    callback(MyAnimeList);
  });
};

// delete MyAnimeList auth
const deleteMyAnimeListAuth = (callback: Callback<void>) => {
  if (ENV === "dev") {
    logger.info("deleting MyAnimeList auth");
    localStorage.removeItem(MYANIMELIST_AUTH_KEY);
    callback();
    return;
  }

  chrome.storage.local.remove(MYANIMELIST_AUTH_KEY, () => {
    logger.info("deleting MyAnimeList auth");
    callback();
  });
};

// get MyAnimeList auth status
const getMyAnimeListAuthStatus = (callback: Callback<AuthStatus | null>) => {
  if (ENV === "dev") {
    logger.info("fetching MyAnimeList auth state");
    const state = localStorage.getItem(MYANIMELIST_AUTH_STATE_KEY);
    if (!state) {
      callback(null);
      return;
    }
    callback(state as AuthStatus);
    return;
  }

  chrome.storage.local.get(MYANIMELIST_AUTH_STATE_KEY, (data) => {
    logger.info("fetching MyAnimeList auth state");
    const state = data?.[MYANIMELIST_AUTH_STATE_KEY] || null;
    callback(state);
  });
};

// set MyAnimeList auth status
const setMyAnimeListAuthStatus = (status: AuthStatus, callback: Callback<AuthStatus>) => {
  if (ENV === "dev") {
    logger.info("setting MyAnimeList auth status");
    localStorage.setItem(MYANIMELIST_AUTH_STATE_KEY, status);
    callback(status);
    return;
  }

  chrome.storage.local.set({ [MYANIMELIST_AUTH_STATE_KEY]: status }, () => {
    logger.info("setting MyAnimeList auth state");
    callback(status);
  });
};

// delete MyAnimeList auth status
const deleteMyAnimeListAuthStatus = (callback: Callback<void>) => {
  if (ENV === "dev") {
    logger.info("deleting MyAnimeList auth status");
    localStorage.removeItem(MYANIMELIST_AUTH_STATE_KEY);
    callback();
    return;
  }

  chrome.storage.local.remove(MYANIMELIST_AUTH_STATE_KEY, () => {
    logger.info("deleting MyAnimeList auth status");
    callback();
  });
};

// get MyAnimeList_AUTO_SYNC_MEDIA_KEY
const getMyAnimeListAutoSyncMedia = (callback: Callback<boolean>) => {
  if (ENV === "dev") {
    logger.info("fetching MyAnimeList auto sync media");
    const syncState = localStorage.getItem(MYANIMELIST_AUTO_SYNC_MEDIA_KEY);
    if (!syncState || syncState !== "true") {
      callback(false);
      return;
    }
    callback(true);
    return;
  }

  chrome.storage.local.get(MYANIMELIST_AUTO_SYNC_MEDIA_KEY, (data) => {
    logger.info("fetching MyAnimeList auto sync media");
    const state = data?.[MYANIMELIST_AUTO_SYNC_MEDIA_KEY] ?? false;
    callback(state);
  });
};

// set MyAnimeList_AUTO_SYNC_MEDIA_KEY
const setMyAnimeListAutoSyncMedia = (value: boolean, callback: Callback<boolean>) => {
  if (ENV === "dev") {
    logger.info(`setting MyAnimeList auto sync media to: ${value}`);
    localStorage.setItem(MYANIMELIST_AUTO_SYNC_MEDIA_KEY, value.toString());
    callback(value);
    return;
  }

  chrome.storage.local.set({ [MYANIMELIST_AUTO_SYNC_MEDIA_KEY]: value }, () => {
    logger.info(`setting MyAnimeList auto sync media to: ${value}`);
    callback(value);
  });
};

const getIsAuthorizedWithMyAnimeList = (callback: Callback<AuthStatus>) => {
  getMyAnimeListAuth((data) => {
    if (!data) {
      logger.info("no MyAnimeList auth data");
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
    logger.info("authorized with MyAnimeList");
    callback("authorized");
  });
};

export {
  getMyAnimeListConfig,
  setMyAnimeListConfig,
  deleteMyAnimeListConfig,
  getMyAnimeListAuth,
  setMyAnimeListAuth,
  deleteMyAnimeListAuth,
  getMyAnimeListAuthStatus,
  setMyAnimeListAuthStatus,
  deleteMyAnimeListAuthStatus,
  getIsAuthorizedWithMyAnimeList,
  getMyAnimeListAutoSyncMedia,
  setMyAnimeListAutoSyncMedia,
};
