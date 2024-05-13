import { Callback } from "@/types/callback";
import { kitaSchema } from "../../data/kitaschema";
import { IVideo } from "../../types/video";
import logger from "../../config/logger";

const VIDEO_KEY = kitaSchema.ApplicationSettings.StorageKeys.VideoKey;
const ENV = process.env.APPLICATION_ENVIRONMENT;

// GET
const getVideoById = (id: string, videos: IVideo[]) => {
  return videos.find((v) => v.id === id) ?? null;
};

const getVideos = (callback: Callback<IVideo[]>) => {
  if (ENV === "dev") {
    logger.info("fetching videos");
    const items = localStorage.getItem(VIDEO_KEY);
    if (!items) {
      callback([]);
      return;
    }
    const value = JSON.parse(items);
    callback(value);
    return;
  }
  chrome.storage.local.get(VIDEO_KEY, (data) => {
    logger.info("fetching videos");
    const items = data?.[VIDEO_KEY] || [];
    callback(items);
  });
};

// SET
const setVideo = (video: IVideo, callback: Callback<IVideo>) => {
  getVideos((data) => {
    const localVideos = data;
    localVideos.push(video);

    if (ENV === "dev") {
      logger.info("setting single video");
      localStorage.setItem(VIDEO_KEY, JSON.stringify(localVideos));
      callback(video);
      return;
    }

    chrome.storage.local.set({ [VIDEO_KEY]: localVideos }, () => {
      logger.info("setting single video");
      callback(video);
    });
  });
};

const setVideos = (videos: IVideo[], callback: Callback<null>) => {
  if (ENV === "dev") {
    logger.info("setting videos");
    localStorage.setItem(VIDEO_KEY, JSON.stringify(videos));
    callback(null);
    return;
  }

  chrome.storage.local.set({ [VIDEO_KEY]: videos }, () => {
    logger.info("setting videos");
    callback(null);
  });
};

const updateVideoById = (id: string, videoNext: IVideo, videos: IVideo[], callback: Callback<IVideo[]>) => {
  const updatedVideos = videos.map((v) => {
    if (v.id === id) {
      return { ...v, ...videoNext };
    }
    return v;
  });

  if (ENV === "dev") {
    logger.info(`updating video id: ${id}`);
    localStorage.setItem(VIDEO_KEY, JSON.stringify(updatedVideos));
    callback(updatedVideos);
    return;
  }

  chrome.storage.local.set({ [VIDEO_KEY]: updatedVideos }, () => {
    logger.info(`updating video id: ${id}`);
    callback(updatedVideos);
  });
};

const deleteVideoById = (id: string, videos: IVideo[], callback: Callback<IVideo[]>) => {
  const localVideos = videos;
  const index = localVideos.findIndex((v) => v.id === id);
  if (index === -1) {
    callback(localVideos);
    return;
  }
  localVideos.splice(index, 1);

  if (ENV === "dev") {
    logger.info(`delete video index: ${index}`);
    localStorage.setItem(VIDEO_KEY, JSON.stringify(localVideos));
    callback(localVideos);
    return;
  }

  chrome.storage.local.set({ [VIDEO_KEY]: localVideos }, () => {
    logger.info(`delete video index: ${index}`);
    callback(localVideos);
  });
};

// DELETE
const deleteAllVideos = (callback: Callback<null>) => {
  if (ENV === "dev") {
    logger.info("deleting all videos");
    localStorage.removeItem(VIDEO_KEY);
    callback(null);
    return;
  }

  chrome.storage.local.remove(VIDEO_KEY, () => {
    logger.info("deleting all videos");
    callback(null);
  });
};

export { kitaSchema, getVideos, setVideo, setVideos, getVideoById, updateVideoById, deleteVideoById, deleteAllVideos };
