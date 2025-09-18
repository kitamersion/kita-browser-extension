import { Callback } from "@/types/callback";
import { kitaSchema } from "../../data/kitaschema";
import { IVideo } from "../../types/video";
import logger from "../../config/logger";

const VIDEO_KEY = kitaSchema.ApplicationSettings.StorageKeys.VideoKey;

// GET
const getVideoById = (id: string, videos: IVideo[]) => {
  return videos.find((v) => v.id === id) ?? null;
};

const getVideos = (callback: Callback<IVideo[]>) => {
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
    logger.info("setting single video");
    chrome.storage.local.set({ [VIDEO_KEY]: localVideos }, () => {
      callback(video);
    });
  });
};

const setVideos = (videos: IVideo[], callback: Callback<null>) => {
  logger.info("setting videos");
  chrome.storage.local.set({ [VIDEO_KEY]: videos }, () => {
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
  logger.info(`updating video id: ${id}`);
  chrome.storage.local.set({ [VIDEO_KEY]: updatedVideos }, () => {
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
  logger.info(`delete video index: ${index}`);
  chrome.storage.local.set({ [VIDEO_KEY]: localVideos }, () => {
    callback(localVideos);
  });
};

// DELETE
const deleteAllVideos = (callback: Callback<null>) => {
  logger.info("deleting all videos");
  chrome.storage.local.remove(VIDEO_KEY, () => {
    callback(null);
  });
};

export { kitaSchema, getVideos, setVideo, setVideos, getVideoById, updateVideoById, deleteVideoById, deleteAllVideos };
