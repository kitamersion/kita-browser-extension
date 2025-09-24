import { Callback } from "@/types/callback";
import { SETTINGS } from "@/api/settings";
import { logger } from "@kitamersion/kita-logging";

const TAG_TOTAL_KEY = SETTINGS.statistics.totalTags.key;

const getTotalTagCount = (callback: Callback<number>) => {
  chrome.storage.local.get(TAG_TOTAL_KEY, async (data) => {
    await logger.info("fetching tag total");
    const items = data?.[TAG_TOTAL_KEY] || 0;
    callback(items);
  });
};

const incrementTotalTags = (value?: number) => {
  getTotalTagCount(async (count) => {
    const newCount = count + (value ?? 1);
    await logger.info("incrementing tag total");
    chrome.storage.local.set({ [TAG_TOTAL_KEY]: newCount });
  });
};

const decrementTotalTags = () => {
  getTotalTagCount(async (count) => {
    if (count === 0) return;
    const newCount = count - 1;
    await logger.info("decrementing tag total");
    chrome.storage.local.set({ [TAG_TOTAL_KEY]: newCount });
  });
};

const resetTotalTags = () => {
  (async () => {
    await logger.info("resetting tag total");
    chrome.storage.local.set({ [TAG_TOTAL_KEY]: 0 });
  })();
};

export { getTotalTagCount, incrementTotalTags, decrementTotalTags, resetTotalTags };
