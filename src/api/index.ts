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

const API = {
  kitaSchema: {
    UserItems: {
      Videos: [],
    },
    ApplicationSettings: {
      IsReady: false,
      StorageKeys: {
        VideoKey: "kita_video_logs",
      },
    },
  } as KitaSchema,

  // initalize

  _initalize() {
    this._initalizeVideos();
    this._initalizeApplication();
  },

  _initalizeVideos() {
    const key = this._getStorageVideoKey();
    chrome.storage.local.get(key, (data) => {
      const existingVideos: IVideo[] = data.video_items || [];
      this.setVideos(existingVideos);
      console.log(existingVideos);
    });
  },

  _initalizeApplication() {
    this.kitaSchema.ApplicationSettings.IsReady = true;
  },

  getIsReady() {
    return this.kitaSchema.ApplicationSettings.IsReady;
  },

  // storage keys
  _getStorageVideoKey() {
    return this.kitaSchema.ApplicationSettings.StorageKeys.VideoKey;
  },

  // crud
  getVideos() {
    return this.kitaSchema.UserItems.Videos;
  },

  setVideos(videos: IVideo[]) {
    this.kitaSchema.UserItems.Videos.push(...videos);
    const key = this._getStorageVideoKey();
    chrome.storage.local.set({ [key]: this.kitaSchema.UserItems.Videos }, () => {
      console.log(this.kitaSchema.UserItems.Videos);
    });
  },

  getVideoById(id: string) {
    return this.getVideos().find((v) => v.id === id) ?? null;
  },

  updateVideoById(id: string, videoNext: IVideo) {
    const updatedVideos = this.kitaSchema.UserItems.Videos.map((v) => {
      if (v.id === id) {
        return { ...v, ...videoNext };
      }
      return v;
    });
    this.kitaSchema.UserItems.Videos = updatedVideos;
    const key = this._getStorageVideoKey();
    chrome.storage.local.set({ [key]: updatedVideos });
    return updatedVideos;
  },

  deleteVideoById(id: string) {
    const index = this.kitaSchema.UserItems.Videos.findIndex((v) => v.id === id);
    if (index === -1) {
      console.warn(`Video with ID ${id} not found.`);
    }
    this.kitaSchema.UserItems.Videos.splice(index, 1);
    chrome.storage.local.set({ video_items: this.kitaSchema.UserItems.Videos });
  },
};

const application = API;
application._initalize();
export default application;
