import { Callback } from "@/types/callback";
import { SETTINGS } from "@/api/settings";
import logger from "@/config/logger";

const VIDEO_TOTAL_KEY = SETTINGS.statistics.totalVideos.key;
const VIDEO_TOTAL_DURATION_KEY = SETTINGS.statistics.totalDuration.key;

const getTotalVideoCount = (callback: Callback<number>) => {
  chrome.storage.local.get(VIDEO_TOTAL_KEY, (data) => {
    logger.info("fetching videos");
    const items = data?.[VIDEO_TOTAL_KEY] || 0;
    callback(items);
  });
};

const incrementTotalVideos = () => {
  getTotalVideoCount((count) => {
    const newCount = count + 1;
    logger.info("incrementing video total");
    chrome.storage.local.set({ [VIDEO_TOTAL_KEY]: newCount });
  });
};

const decrementTotalVideos = () => {
  getTotalVideoCount((count) => {
    if (count === 0) return;
    const newCount = count - 1;
    logger.info("decrementing video total");
    chrome.storage.local.set({ [VIDEO_TOTAL_KEY]: newCount });
  });
};

const resetTotalVideos = () => {
  logger.info("resetting video total");
  chrome.storage.local.set({ [VIDEO_TOTAL_KEY]: 0 });
};

// get total video duration
const getTotalVideoDuration = (callback: Callback<number>) => {
  chrome.storage.local.get(VIDEO_TOTAL_DURATION_KEY, (data) => {
    logger.info("fetching video duration");
    const items = data?.[VIDEO_TOTAL_DURATION_KEY] || 0;
    callback(items);
  });
};

// increment total video duration
const incrementTotalVideoDuration = (duration: number) => {
  getTotalVideoDuration((totalDuration) => {
    const newDuration = totalDuration + duration;
    logger.info("incrementing video duration");
    chrome.storage.local.set({ [VIDEO_TOTAL_DURATION_KEY]: newDuration });
  });
};

// decrement total video duration
const decrementTotalVideoDuration = (duration: number) => {
  getTotalVideoDuration((totalDuration) => {
    if (totalDuration === 0) return;
    const newDuration = totalDuration - duration;
    logger.info("decrementing video duration");
    chrome.storage.local.set({ [VIDEO_TOTAL_DURATION_KEY]: newDuration });
  });
};

// reset total video duration
const resetTotalVideoDuration = () => {
  logger.info("resetting video duration");
  chrome.storage.local.set({ [VIDEO_TOTAL_DURATION_KEY]: 0 });
};

export {
  getTotalVideoCount,
  incrementTotalVideos,
  decrementTotalVideos,
  resetTotalVideos,
  getTotalVideoDuration,
  incrementTotalVideoDuration,
  decrementTotalVideoDuration,
  resetTotalVideoDuration,
};
