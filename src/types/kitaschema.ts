import { ITag } from "./tag";
import { IVideo } from "./video";

export type StorageKeys = {
  ApplicationEnabledKey: string;
  VideoKey: string;
  TagKey: string;
  ThemeKey: string;
  TotalKeys: TotalKeys;
};

export type TotalKeys = {
  Videos: string;
  Tags: string;
};

export type ApplicationSettings = {
  IsReady: boolean;
  IsApplicationEnabled: boolean;
  StorageKeys: StorageKeys;
};

export type UserItems = {
  Videos: IVideo[];
  Tags: ITag[];
  Total: Total;
};

export type Total = {
  Videos: number;
  Tags: number;
};

export type KitaSchema = {
  UserItems: UserItems;
  ApplicationSettings: ApplicationSettings;
};
