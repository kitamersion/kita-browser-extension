import { IVideo } from "@/content";

type StorageKeys = {
  VideoKey: string;
};

type ApplicationSettings = {
  IsReady: boolean;
  StorageKeys: StorageKeys;
};

type UserItems = {
  Videos: IVideo[];
};

type KitaSchema = {
  UserItems: UserItems;
  ApplicationSettings: ApplicationSettings;
};

const kitaSchema: KitaSchema = {
  UserItems: {
    Videos: [],
  },
  ApplicationSettings: {
    IsReady: false,
    StorageKeys: {
      VideoKey: "kita_video_logs",
    },
  },
};

const VIDEO_KEY = kitaSchema.ApplicationSettings.StorageKeys.VideoKey;

// GET
const getVideoById = (id: string, videos: IVideo[]) => {
  return videos.find((v) => v.id === id) ?? null;
};

const getVideos = (callback: (data: IVideo[]) => void) => {
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
    chrome.storage.local.set({ [VIDEO_KEY]: localVideos }, () => {
      console.log("setting single video");
      callback(video);
    });
  });
};

const setVideos = (videos: IVideo[], callback: () => void) => {
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
  }
  localVideos.splice(index, 1);
  chrome.storage.local.set({ video_items: localVideos }, () => {
    console.log("delete video index: ", index);
    callback(localVideos);
  });
};

// DELETE
const deleteAllVideos = (callback: () => void) => {
  chrome.storage.local.remove(VIDEO_KEY, () => {
    console.log("deleting all videos");
    callback();
  });
};

export { kitaSchema, getVideos, setVideo, setVideos, getVideoById, updateVideoById, deleteVideoById, deleteAllVideos };
