import { format } from "date-fns";
import { SHA256 } from "crypto-js";
import { IVideo } from "@/types/video";

const SETTINGS_PAGE_NAME = "settings.html";
const STATISTICS_PAGE_NAME = "statistics.html";

// original H M S formatter used across the app and tests
export const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return `0h 0m 0s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

// human-friendly compact formatter for long durations (used for "All Time")
export const formatDurationHuman = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return `0s`;

  const MIN = 60;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY; // approximation
  const YEAR = 365 * DAY; // approximation

  // For very large durations, use smarter rounding
  if (seconds >= YEAR) {
    const years = seconds / YEAR;
    if (years >= 2) {
      return `${Math.round(years)}y`; // "3y" instead of "3y 2mo" for clarity
    }
    const months = Math.floor((seconds % YEAR) / MONTH);
    return months > 0 ? `${Math.floor(years)}y ${months}mo` : `${Math.floor(years)}y`;
  }

  if (seconds >= MONTH) {
    const months = Math.floor(seconds / MONTH);
    const weeks = Math.floor((seconds % MONTH) / WEEK);
    return weeks > 0 ? `${months}mo ${weeks}w` : `${months}mo`;
  }

  // For weeks, prefer days if it's more natural (e.g., "10d" vs "1w 3d")
  if (seconds >= WEEK) {
    const totalDays = Math.floor(seconds / DAY);
    if (totalDays <= 13) {
      // Less than 2 weeks, show in days
      return `${totalDays}d`;
    }
    const weeks = Math.floor(seconds / WEEK);
    const days = Math.floor((seconds % WEEK) / DAY);
    return days > 0 ? `${weeks}w ${days}d` : `${weeks}w`;
  }

  if (seconds >= DAY) {
    const days = Math.floor(seconds / DAY);
    const hours = Math.floor((seconds % DAY) / HOUR);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (seconds >= HOUR) {
    const hours = Math.floor(seconds / HOUR);
    const minutes = Math.floor((seconds % HOUR) / MIN);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (seconds >= MIN) {
    const minutes = Math.floor(seconds / MIN);
    const remainingSeconds = Math.floor(seconds % MIN);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${Math.floor(seconds)}s`;
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
