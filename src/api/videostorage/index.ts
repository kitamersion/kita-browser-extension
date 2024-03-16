import { Callback } from "@/types/callback";
import { kitaSchema } from "../../data/kitaschema";
import { IVideo } from "../../types/video";

const VIDEO_KEY = kitaSchema.ApplicationSettings.StorageKeys.VideoKey;
const ENV = process.env.APPLICATION_ENVIRONMENT;

// GET
const getVideoById = (id: string, videos: IVideo[]) => {
  return videos.find((v) => v.id === id) ?? null;
};

const getVideos = (callback: Callback<IVideo[]>) => {
  if (ENV === "dev") {
    console.log("fetching videos");
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
    console.log("fetching videos");
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
      console.log("setting single video");
      localStorage.setItem(VIDEO_KEY, JSON.stringify(localVideos));
      callback(video);
      return;
    }

    chrome.storage.local.set({ [VIDEO_KEY]: localVideos }, () => {
      console.log("setting single video");
      callback(video);
    });
  });
};

const setVideos = (videos: IVideo[], callback: Callback<null>) => {
  if (ENV === "dev") {
    console.log("setting videos");
    localStorage.setItem(VIDEO_KEY, JSON.stringify(videos));
    callback(null);
    return;
  }

  chrome.storage.local.set({ [VIDEO_KEY]: videos }, () => {
    console.log("setting videos");
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
    console.log("updating video id: ", id);
    localStorage.setItem(VIDEO_KEY, JSON.stringify(updatedVideos));
    callback(updatedVideos);
    return;
  }

  chrome.storage.local.set({ [VIDEO_KEY]: updatedVideos }, () => {
    console.log("updating video id: ", id);
    callback(updatedVideos);
  });
};

const deleteVideoById = (id: string, videos: IVideo[], callback: Callback<IVideo[]>) => {
  const localVideos = videos;
  const index = localVideos.findIndex((v) => v.id === id);
  if (index === -1) {
    console.warn(`video with id ${id} not found.`);
    callback(localVideos);
    return;
  }
  localVideos.splice(index, 1);

  if (ENV === "dev") {
    console.log("delete video index: ", index);
    localStorage.setItem(VIDEO_KEY, JSON.stringify(localVideos));
    callback(localVideos);
    return;
  }

  chrome.storage.local.set({ [VIDEO_KEY]: localVideos }, () => {
    console.log("delete video index: ", index);
    callback(localVideos);
  });
};

// DELETE
const deleteAllVideos = (callback: Callback<null>) => {
  if (ENV === "dev") {
    console.log("deleting all videos");
    localStorage.removeItem(VIDEO_KEY);
    callback(null);
    return;
  }

  chrome.storage.local.remove(VIDEO_KEY, () => {
    console.log("deleting all videos");
    callback(null);
  });
};

export { kitaSchema, getVideos, setVideo, setVideos, getVideoById, updateVideoById, deleteVideoById, deleteAllVideos };
