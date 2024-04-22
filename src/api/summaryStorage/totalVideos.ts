import { Callback } from "@/types/callback";
import { kitaSchema } from "../videostorage";

const VIDEO_TOTAL_KEY = kitaSchema.ApplicationSettings.StorageKeys.TotalKeys.Videos;
const ENV = process.env.APPLICATION_ENVIRONMENT;

const getTotalVideoCount = (callback: Callback<number>) => {
  if (ENV === "dev") {
    console.log("fetching videos");
    const items = localStorage.getItem(VIDEO_TOTAL_KEY);
    if (!items) {
      callback(0);
      return;
    }
    const value = JSON.parse(items);
    callback(value);
    return;
  }
  chrome.storage.local.get(VIDEO_TOTAL_KEY, (data) => {
    console.log("fetching videos");
    const items = data?.[VIDEO_TOTAL_KEY] || 0;
    callback(items);
  });
};

const incrementTotalVideos = () => {
  getTotalVideoCount((count) => {
    const newCount = count + 1;
    if (ENV === "dev") {
      console.log("incrementing video total");
      localStorage.setItem(VIDEO_TOTAL_KEY, JSON.stringify(newCount));
    } else {
      console.log("incrementing video total");
      chrome.storage.local.set({ [VIDEO_TOTAL_KEY]: newCount });
    }
  });
};

const decrementTotalVideos = () => {
  getTotalVideoCount((count) => {
    if (count === 0) return;

    const newCount = count - 1;
    if (ENV === "dev") {
      console.log("decrementing video total");
      localStorage.setItem(VIDEO_TOTAL_KEY, JSON.stringify(newCount));
    } else {
      console.log("decrementing video total");
      chrome.storage.local.set({ [VIDEO_TOTAL_KEY]: newCount });
    }
  });
};

const resetTotalVideos = () => {
  if (ENV === "dev") {
    console.log("resetting video total");
    localStorage.setItem(VIDEO_TOTAL_KEY, JSON.stringify(0));
  } else {
    console.log("resetting video total");
    chrome.storage.local.set({ [VIDEO_TOTAL_KEY]: 0 });
  }
};

export { getTotalVideoCount, incrementTotalVideos, decrementTotalVideos, resetTotalVideos };
