import { format } from "date-fns";

const ENV = process.env.APPLICATION_ENVIRONMENT;
const SETTINGS_PAGE_NAME = "settings.html";
const STATISTICS_PAGE_NAME = "statistics.html";

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
};

export const convertToSeconds = (time: string) => {
  const timeParts = time.split(" ");
  const hours = parseInt(timeParts[0]) * 3600;
  const minutes = parseInt(timeParts[1]) * 60;
  const seconds = parseInt(timeParts[2]);

  return hours + minutes + seconds;
};

export const formatTimestamp = (timestamp: number) => {
  return format(new Date(timestamp), "dd-MM-yyyy");
};

const createTab = (url: string) => {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url }, (tab) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(tab);
    });
  });
};

const pageNaginator = async (page: string) => {
  if (ENV === "dev") {
    window.open(page, "_blank");
    return;
  }

  const settingsUrl = chrome.runtime.getURL(`/${page}`);
  await createTab(settingsUrl);
};

export const settingsNavigation = async () => pageNaginator(SETTINGS_PAGE_NAME);
export const statisticsNavigation = async () => pageNaginator(STATISTICS_PAGE_NAME);
