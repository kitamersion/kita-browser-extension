import { format } from "date-fns";

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

const ENV = process.env.APPLICATION_ENVIRONMENT;
const PAGE_NAME = "settings.html";
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

export const settingsNavigation = async () => {
  if (ENV === "dev") {
    window.open(PAGE_NAME, "_blank");
    return;
  }

  const settingsUrl = chrome.runtime.getURL(`/${PAGE_NAME}`);
  await createTab(settingsUrl);
};
