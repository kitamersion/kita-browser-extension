import { Callback } from "@/types/callback";
import { TITLE_OFF, TITLE_ON } from "@/data/contants";
import logger from "@/config/logger";
import { settingsManager, SETTINGS } from "@/api/settings";

const getExtensionBaseUrl = () => {
  return chrome.identity.getRedirectURL("settings.html");
};

// SET
const setApplicationEnabled = async (value: boolean, callback: Callback<boolean>) => {
  try {
    logger.info(`setting application enabled state to: ${value}`);
    await settingsManager.set(SETTINGS.application.enabled, value);
    setApplicationState(value);
    callback(value);
  } catch (error) {
    logger.error(`Error setting application enabled state: ${error}`);
    callback(value); // Still call callback even if there's an error
  }
};

// GET
const getApplicationEnabled = async (callback: Callback<boolean>) => {
  try {
    logger.info("fetching application enabled state");
    const value = await settingsManager.get(SETTINGS.application.enabled);
    setApplicationState(value);
    callback(value);
  } catch (error) {
    logger.error(`Error getting application enabled state: ${error}`);
    callback(false); // Default to false on error
  }
};

// set CONTENT_SCRIPT_ENABLED_KEY
const setContentScriptEnabled = async (value: boolean, callback: Callback<boolean>) => {
  try {
    logger.info(`setting content script enabled state to: ${value}`);
    await settingsManager.set(SETTINGS.application.contentScriptEnabled, value);
    setApplicationState(value);
    callback(value);

    // send message to content.js in all tabs
    chrome.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id ?? 0, { IsContentScriptEnabled: value });
      }
    });
  } catch (error) {
    logger.error(`Error setting content script enabled state: ${error}`);
    callback(value);
  }
};

// get CONTENT_SCRIPT_ENABLED_KEY
const getContentScriptEnabled = async (callback: Callback<boolean>) => {
  try {
    logger.info("fetching content script enabled state");
    const value = await settingsManager.get(SETTINGS.application.contentScriptEnabled);
    setApplicationState(value);
    callback(value);
  } catch (error) {
    logger.error(`Error getting content script enabled state: ${error}`);
    callback(true); // Default to true on error
  }
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
