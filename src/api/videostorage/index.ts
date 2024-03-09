import { kitaSchema } from "../../data/kitaschema";
import { IVideo } from "../../types/video";

const VIDEO_KEY = kitaSchema.ApplicationSettings.StorageKeys.VideoKey;
const env = process.env.APPLICATION_ENVIRONMENT;

console.log("ENV: ", env);

// GET
const getVideoById = (id: string, videos: IVideo[]) => {
  return videos.find((v) => v.id === id) ?? null;
};

const getVideos = (callback: (data: IVideo[]) => void) => {
  if (env === "dev") {
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
const setVideo = (video: IVideo, callback: (data: IVideo) => void) => {
  getVideos((data) => {
    const localVideos = data;
    localVideos.push(video);

    if (env === "dev") {
      console.log("setting single video");
      localStorage.set(VIDEO_KEY, JSON.stringify(localVideos));
      callback(video);
      return;
    }

    chrome.storage.local.set({ [VIDEO_KEY]: localVideos }, () => {
      console.log("setting single video");
      callback(video);
    });
  });
};

const setVideos = (videos: IVideo[], callback: () => void) => {
  if (env === "dev") {
    console.log("setting videos");
    localStorage.set(VIDEO_KEY, JSON.stringify(videos));
    callback();
    return;
  }

  chrome.storage.local.set({ [VIDEO_KEY]: videos }, () => {
    console.log("setting videos");
    callback();
  });
};

const updateVideoById = (id: string, videoNext: IVideo, videos: IVideo[], callback: (updatedVideos: IVideo[]) => void) => {
  const updatedVideos = videos.map((v) => {
    if (v.id === id) {
      return { ...v, ...videoNext };
    }
    return v;
  });

  if (env === "dev") {
    console.log("updating video with id: ", id);
    localStorage.set(VIDEO_KEY, JSON.stringify(updatedVideos));
    callback(updatedVideos);
    return;
  }

  chrome.storage.local.set({ [VIDEO_KEY]: updatedVideos }, () => {
    console.log("updating video with id: ", id);
    callback(updatedVideos);
  });
};

const deleteVideoById = (id: string, videos: IVideo[], callback: (data: IVideo[]) => void) => {
  const localVideos = videos;
  const index = localVideos.findIndex((v) => v.id === id);
  if (index === -1) {
    console.warn(`video with id ${id} not found.`);
    callback(localVideos);
    return;
  }
  localVideos.splice(index, 1);

  if (env === "dev") {
    console.log("delete video index: ", index);
    localStorage.set(VIDEO_KEY, JSON.stringify(localVideos));
    callback(localVideos);
    return;
  }

  chrome.storage.local.set({ [VIDEO_KEY]: localVideos }, () => {
    console.log("delete video index: ", index);
    callback(localVideos);
  });
};

// DELETE
const deleteAllVideos = (callback: () => void) => {
  if (env === "dev") {
    console.log("deleting all videos");
    localStorage.removeItem(VIDEO_KEY);
    callback();
    return;
  }

  chrome.storage.local.remove(VIDEO_KEY, () => {
    console.log("deleting all videos");
    callback();
  });
};

export { kitaSchema, getVideos, setVideo, setVideos, getVideoById, updateVideoById, deleteVideoById, deleteAllVideos };
