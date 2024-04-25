import { kitaSchema } from "@/data/kitaschema";
import { Callback } from "@/types/callback";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";

const ENV = process.env.APPLICATION_ENVIRONMENT;
const ANILIST_CONFIG_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistConfigKey;
const ANILIST_AUTH_KEY = kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistAuthKey;

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
    console.log("fetching anilist config");
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

export { getAnilistConfig, setAnilistConfig, deleteAnilistConfig, getAnilistAuth, setAnilistAuth };
