import { Callback } from "@/types/callback";
import { kitaSchema } from "../videostorage";
import { IApplication } from "@/types/application";
import { TITLE_OFF, TITLE_ON } from "@/data/contants";
import logger from "@/config/logger";

const APPLICATION_ENABLED_KEY = kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey;
const CONTENT_SCRIPT_ENABLED_KEY = kitaSchema.ApplicationSettings.StorageKeys.ContentScriptEnabledKey;

const getExtensionBaseUrl = () => {
  return chrome.identity.getRedirectURL("settings.html");
};

// SET
// @todo: make this generic for future use
const setApplicationEnabled = (value: boolean, callback: Callback<boolean>) => {
  const storageValue: IApplication = {
    IsApplicationEnabled: value,
  };

  logger.info(`setting application enabled state to: ${value}`);

  chrome.storage.local.set({ [APPLICATION_ENABLED_KEY]: storageValue }, () => {
    logger.info(`setting application enabled state to: ${value}`);
    setApplicationState(value);
    callback(value);
  });
};

// GET
// @todo: make this generic for future use
const getApplicationEnabled = (callback: Callback<boolean>) => {
  logger.info("fetching application enabled state");

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

  logger.info(`setting content script enabled state to: ${value}`);

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
  logger.info("fetching content script enabled state");

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
