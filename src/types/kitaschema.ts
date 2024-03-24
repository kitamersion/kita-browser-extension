import { ITag } from "./tag";
import { IVideo } from "./video";

export type StorageKeys = {
  ApplicationEnabledKey: string;
  VideoKey: string;
  TagKey: string;
  ThemeKey: string;
};

export type ApplicationSettings = {
  IsReady: boolean;
  IsApplicationEnabled: boolean;
  StorageKeys: StorageKeys;
};

export type UserItems = {
  Videos: IVideo[];
  Tags: ITag[];
};

export type KitaSchema = {
  UserItems: UserItems;
  ApplicationSettings: ApplicationSettings;
};
