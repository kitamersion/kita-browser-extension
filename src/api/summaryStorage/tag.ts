import { Callback } from "@/types/callback";
import { kitaSchema } from "../videostorage";
import logger from "@/config/logger";

const TAG_TOTAL_KEY = kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.TagStatisticsKeys.TotalTagsKey;
const ENV = process.env.APPLICATION_ENVIRONMENT;

const getTotalTagCount = (callback: Callback<number>) => {
  if (ENV === "dev") {
    logger.info("fetching tag total");
    const items = localStorage.getItem(TAG_TOTAL_KEY);
    if (!items) {
      callback(0);
      return;
    }
    const value = JSON.parse(items);
    callback(value);
    return;
  }
  chrome.storage.local.get(TAG_TOTAL_KEY, (data) => {
    logger.info("fetching tag total");
    const items = data?.[TAG_TOTAL_KEY] || 0;
    callback(items);
  });
};

const incrementTotalTags = (value?: number) => {
  getTotalTagCount((count) => {
    const newCount = count + (value ?? 1);
    if (ENV === "dev") {
      logger.info("incrementing tag total");
      localStorage.setItem(TAG_TOTAL_KEY, JSON.stringify(newCount));
    } else {
      logger.info("incrementing tag total");
      chrome.storage.local.set({ [TAG_TOTAL_KEY]: newCount });
    }
  });
};

const decrementTotalTags = () => {
  getTotalTagCount((count) => {
    if (count === 0) return;
    const newCount = count - 1;
    if (ENV === "dev") {
      logger.info("decrementing tag total");
      localStorage.setItem(TAG_TOTAL_KEY, JSON.stringify(newCount));
    } else {
      logger.info("decrementing tag total");
      chrome.storage.local.set({ [TAG_TOTAL_KEY]: newCount });
    }
  });
};

const resetTotalTags = () => {
  if (ENV === "dev") {
    logger.info("resetting tag total");
    localStorage.setItem(TAG_TOTAL_KEY, JSON.stringify(0));
  } else {
    logger.info("resetting tag total");
    chrome.storage.local.set({ [TAG_TOTAL_KEY]: 0 });
  }
};

export { getTotalTagCount, incrementTotalTags, decrementTotalTags, resetTotalTags };
