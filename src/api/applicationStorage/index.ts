import { Callback } from "@/types/callback";
import { kitaSchema } from "../videostorage";
import { IApplication } from "@/types/application";
import { TITLE_OFF, TITLE_ON } from "@/data/contants";
import logger from "@/config/logger";

const APPLICATION_ENABLED_KEY = kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey;
const CONTENT_SCRIPT_ENABLED_KEY = kitaSchema.ApplicationSettings.StorageKeys.ContentScriptEnabledKey;
const ENV = process.env.APPLICATION_ENVIRONMENT;

const getExtensionBaseUrl = () => {
  if (ENV === "dev") {
    return window.location.origin;
  }
  return chrome.identity.getRedirectURL("settings.html");
};

// SET
// @todo: make this generic for future use
const setApplicationEnabled = (value: boolean, callback: Callback<boolean>) => {
  const storageValue: IApplication = {
    IsApplicationEnabled: value,
  };

  if (ENV === "dev") {
    logger.info(`setting application enabled state to: ${value}`);
    localStorage.setItem(APPLICATION_ENABLED_KEY, JSON.stringify(storageValue));
    callback(value);
    return;
  }

  chrome.storage.local.set({ [APPLICATION_ENABLED_KEY]: storageValue }, () => {
    logger.info(`setting application enabled state to: ${value}`);
    setApplicationState(value);
    callback(value);
  });
};

// GET
// @todo: make this generic for future use
const getApplicationEnabled = (callback: Callback<boolean>) => {
  if (ENV === "dev") {
    logger.info("fetching application enabled state");
    const items = localStorage.getItem(APPLICATION_ENABLED_KEY);
    if (!items) {
      callback(false);
      return;
    }
    const value: IApplication = JSON.parse(items);
    callback(value.IsApplicationEnabled);
    return;
  }

  chrome.storage.local.get(APPLICATION_ENABLED_KEY, (data) => {
    const value: IApplication = data?.[APPLICATION_ENABLED_KEY] || { IsApplicationEnabled: false };
    try {
      setApplicationState(value.IsApplicationEnabled);
      callback(value.IsApplicationEnabled);
    } catch (error) {
      logger.error(`Error getting application enabled state ${error}`);
      callback(value.IsApplicationEnabled);
    }
  });
};

// set CONTENT_SCRIPT_ENABLED_KEY
const setContentScriptEnabled = (value: boolean, callback: Callback<boolean>) => {
  const storageValue = {
    IsContentScriptEnabled: value,
  };

  if (ENV === "dev") {
    logger.info(`setting content script enabled state to: ${value}`);
    localStorage.setItem(CONTENT_SCRIPT_ENABLED_KEY, JSON.stringify(storageValue));
    callback(value);
    return;
  }

  chrome.storage.local.set({ [CONTENT_SCRIPT_ENABLED_KEY]: storageValue }, () => {
    logger.info(`setting content script enabled state to: ${value}`);
    setApplicationState(value);
    callback(value);

    // send message to content.js in all tabs
    chrome.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id ?? 0, storageValue);
      }
    });
  });
};

// get CONTENT_SCRIPT_ENABLED_KEY
const getContentScriptEnabled = (callback: Callback<boolean>) => {
  if (ENV === "dev") {
    logger.info("fetching content script enabled state");
    const items = localStorage.getItem(CONTENT_SCRIPT_ENABLED_KEY);
    if (!items) {
      callback(true);
      return;
    }
    const value = JSON.parse(items);
    callback(value.IsContentScriptEnabled);
    return;
  }

  chrome.storage.local.get(CONTENT_SCRIPT_ENABLED_KEY, (data) => {
    const value = data?.[CONTENT_SCRIPT_ENABLED_KEY] || { IsContentScriptEnabled: true };
    try {
      setApplicationState(value.IsContentScriptEnabled);
      callback(value.IsContentScriptEnabled);
    } catch (error) {
      logger.error(`Error getting content script enabled state ${error}`);
      callback(value.IsContentScriptEnabled);
    }
  });
};

const setApplicationState = (enabled: boolean) => {
  // icon
  const iconPath = enabled ? "/icons/enabled/icon32.png" : "/icons/disabled/icon32.png";
  chrome.action.setIcon({ path: iconPath });

  // title
  const title = enabled ? TITLE_ON : TITLE_OFF;
  chrome.action.setTitle({ title: title });
};

export { getExtensionBaseUrl, getApplicationEnabled, setApplicationEnabled, getContentScriptEnabled, setContentScriptEnabled };
