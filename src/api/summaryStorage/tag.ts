import { Callback } from "@/types/callback";
import { kitaSchema } from "../videostorage";

const TAG_TOTAL_KEY = kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.TagStatisticsKeys.TotalTagsKey;
const ENV = process.env.APPLICATION_ENVIRONMENT;

const getTotalTagCount = (callback: Callback<number>) => {
  if (ENV === "dev") {
    console.log("fetching tag total");
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
    console.log("fetching tag total");
    const items = data?.[TAG_TOTAL_KEY] || 0;
    callback(items);
  });
};

const incrementTotalTags = () => {
  getTotalTagCount((count) => {
    const newCount = count + 1;
    if (ENV === "dev") {
      console.log("incrementing tag total");
      localStorage.setItem(TAG_TOTAL_KEY, JSON.stringify(newCount));
    } else {
      console.log("incrementing tag total");
      chrome.storage.local.set({ [TAG_TOTAL_KEY]: newCount });
    }
  });
};

const decrementTotalTags = () => {
  getTotalTagCount((count) => {
    if (count === 0) return;
    const newCount = count - 1;
    if (ENV === "dev") {
      console.log("decrementing tag total");
      localStorage.setItem(TAG_TOTAL_KEY, JSON.stringify(newCount));
    } else {
      console.log("decrementing tag total");
      chrome.storage.local.set({ [TAG_TOTAL_KEY]: newCount });
    }
  });
};

const resetTotalTags = () => {
  if (ENV === "dev") {
    console.log("resetting tag total");
    localStorage.setItem(TAG_TOTAL_KEY, JSON.stringify(0));
  } else {
    console.log("resetting tag total");
    chrome.storage.local.set({ [TAG_TOTAL_KEY]: 0 });
  }
};

export { getTotalTagCount, incrementTotalTags, decrementTotalTags, resetTotalTags };
