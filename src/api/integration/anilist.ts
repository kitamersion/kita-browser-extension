import { kitaSchema } from "@/data/kitaschema";
import { Callback } from "@/types/callback";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";
import { AuthStatus } from "@/types/kitaschema";

const ENV = process.env.APPLICATION_ENVIRONMENT;
const ANILIST_CONFIG_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistConfigKey;
const ANILIST_AUTH_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistAuthKey;
const ANILIST_AUTH_STATE_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AuthStatus;

// get anlist config
const getAnilistConfig = (callback: Callback<AnilistConfig | null>) => {
  if (ENV === "dev") {
    console.log("fetching anilist config");
    const anilist = localStorage.getItem(ANILIST_CONFIG_KEY);
    if (!anilist) {
      callback(null);
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
    console.log("setting anilist config");
    localStorage.setItem(ANILIST_CONFIG_KEY, JSON.stringify(anilist));
    callback(anilist);
    return;
  }

  chrome.storage.local.set({ [ANILIST_CONFIG_KEY]: anilist }, () => {
    console.log("setting anilist config");
    callback(anilist);
  });
};

// delete anilist config
const deleteAnilistConfig = (callback: Callback<void>) => {
  if (ENV === "dev") {
    console.log("deleting anilist config");
    localStorage.removeItem(ANILIST_CONFIG_KEY);
    callback();
    return;
  }

  chrome.storage.local.remove(ANILIST_CONFIG_KEY, () => {
    console.log("deleting anilist config");
    callback();
  });
};

// get anilist auth
const getAnilistAuth = (callback: Callback<AnilistAuth | null>) => {
  if (ENV === "dev") {
    console.log("fetching anilist auth");
    const anilist = localStorage.getItem(ANILIST_AUTH_KEY);
    if (!anilist) {
      callback(null);
      return;
    }
    callback(JSON.parse(anilist));
    return;
  }

  chrome.storage.local.get(ANILIST_AUTH_KEY, (data) => {
    console.log("fetching anilist auth");
    const anilist = data?.[ANILIST_AUTH_KEY] || null;
    callback(anilist);
  });
};

// set anilist auth
const setAnilistAuth = (anilist: AnilistAuth, callback: Callback<AnilistAuth>) => {
  if (ENV === "dev") {
    console.log("setting anilist auth");
    localStorage.setItem(ANILIST_AUTH_KEY, JSON.stringify(anilist));
    callback(anilist);
    return;
  }

  chrome.storage.local.set({ [ANILIST_AUTH_KEY]: anilist }, () => {
    console.log("setting anilist auth");
    callback(anilist);
  });
};

// delete anilist auth
const deleteAnilistAuth = (callback: Callback<void>) => {
  if (ENV === "dev") {
    console.log("deleting anilist auth");
    localStorage.removeItem(ANILIST_AUTH_KEY);
    callback();
    return;
  }

  chrome.storage.local.remove(ANILIST_AUTH_KEY, () => {
    console.log("deleting anilist auth");
    callback();
  });
};

// get anilist auth status
const getAnilistAuthStatus = (callback: Callback<AuthStatus | null>) => {
  if (ENV === "dev") {
    console.log("fetching anilist auth state");
    const state = localStorage.getItem(ANILIST_AUTH_STATE_KEY);
    if (!state) {
      callback(null);
      return;
    }
    callback(state as AuthStatus);
    return;
  }

  chrome.storage.local.get(ANILIST_AUTH_STATE_KEY, (data) => {
    console.log("fetching anilist auth state");
    const state = data?.[ANILIST_AUTH_STATE_KEY] || null;
    callback(state);
  });
};

// set anilist auth status
const setAnilistAuthStatus = (status: AuthStatus, callback: Callback<AuthStatus>) => {
  if (ENV === "dev") {
    console.log("setting anilist auth status");
    localStorage.setItem(ANILIST_AUTH_STATE_KEY, status);
    callback(status);
    return;
  }

  chrome.storage.local.set({ [ANILIST_AUTH_STATE_KEY]: status }, () => {
    console.log("setting anilist auth state");
    callback(status);
  });
};

// delete anilist auth status
const deleteAnilistAuthStatus = (callback: Callback<void>) => {
  if (ENV === "dev") {
    console.log("deleting anilist auth status");
    localStorage.removeItem(ANILIST_AUTH_STATE_KEY);
    callback();
    return;
  }

  chrome.storage.local.remove(ANILIST_AUTH_STATE_KEY, () => {
    console.log("deleting anilist auth status");
    callback();
  });
};

const getIsAuthorizedWithAnilist = (callback: Callback<AuthStatus>) => {
  getAnilistAuth((data) => {
    if (!data) {
      console.log("no anilist auth data");
      callback("initial");
      return;
    }
    if (!data?.access_token) {
      console.log("no access token");
      callback("initial");
      return;
    }

    if (!data?.issued_at) {
      console.log("no issued_at");
      callback("unauthorized");
      return;
    }

    const nowInSeconds = Date.now() / 1000;
    const issuedInSeconds = data?.issued_at / 1000;
    if (nowInSeconds > issuedInSeconds + data?.expires_in) {
      console.log("access token expired");
      callback("unauthorized");
      return;
    }
    console.log("authorized with anilist");
    callback("authorized");
  });
};

export {
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
};
