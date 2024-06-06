import { format } from "date-fns";
import { SHA256 } from "crypto-js";
import { IVideo } from "@/types/video";

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
  return format(new Date(timestamp), "yyyy-MM-dd");
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

export const settingsNavigation = async () => await pageNaginator(SETTINGS_PAGE_NAME);
export const statisticsNavigation = async () => await pageNaginator(STATISTICS_PAGE_NAME);

export const generateUniqueCode = (video_title: string, origin: string): string => {
  const hash = SHA256(video_title + origin);

  return hash.toString();
};

export const filterVideos = (videos: IVideo[], date: Date): IVideo[] => {
  const now = date.getTime();
  return videos.filter((video) => video.created_at > now);
};

type DateFromNow = "FUTURE" | "PAST";
export const getDateFromNow = (days: number, from: DateFromNow = "PAST") => {
  const now = new Date();
  if (from === "FUTURE") {
    now.setDate(now.getDate() + days);
    return now;
  }
  now.setDate(now.getDate() - days);
  return now;
};

export const randomOffset = (min = 1000, max = 5000) => Math.floor(Math.random() * (max - min + 1)) + min;

// @todo write tests
export const generateRandomString = (length: number): string => {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
