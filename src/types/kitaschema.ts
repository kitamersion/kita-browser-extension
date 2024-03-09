import { IVideo } from "./video";

export type StorageKeys = {
  VideoKey: string;
};

export type ApplicationSettings = {
  IsReady: boolean;
  StorageKeys: StorageKeys;
};

export type UserItems = {
  Videos: IVideo[];
};

export type KitaSchema = {
  UserItems: UserItems;
  ApplicationSettings: ApplicationSettings;
};
