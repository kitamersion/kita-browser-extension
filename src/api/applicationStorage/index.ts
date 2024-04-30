import { Callback } from "@/types/callback";
import { kitaSchema } from "../videostorage";
import { IApplication } from "@/types/application";
import { TITLE_OFF, TITLE_ON } from "@/data/contants";

const TAG_KEY = kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey;
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
    console.log(`setting application enabled state to: ${value}`);
    localStorage.setItem(TAG_KEY, JSON.stringify(storageValue));
    callback(value);
    return;
  }

  chrome.storage.local.set({ [TAG_KEY]: storageValue }, () => {
    console.log(`setting application enabled state to: ${value}`);
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

// GET
// @todo: make this generic for future use
const getApplicationEnabled = (callback: Callback<boolean>) => {
  if (ENV === "dev") {
    console.log("fetching application enabled state");
    const items = localStorage.getItem(TAG_KEY);
    if (!items) {
      callback(true);
      return;
    }
    const value: IApplication = JSON.parse(items);
    callback(value.IsApplicationEnabled);
    return;
  }

  chrome.storage.local.get(TAG_KEY, (data) => {
    const value: IApplication = data?.[TAG_KEY] || { IsApplicationEnabled: true };
    try {
      setApplicationState(value.IsApplicationEnabled);
      callback(value.IsApplicationEnabled);
    } catch (error) {
      console.error("Error getting application enabled state", error);
      callback(value.IsApplicationEnabled);
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

export { getExtensionBaseUrl, getApplicationEnabled, setApplicationEnabled };
