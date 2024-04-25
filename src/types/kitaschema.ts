import { IVideoTag } from "./relationship";
import { ITag } from "./tag";
import { IVideo } from "./video";

export type StorageKeys = {
  ApplicationEnabledKey: string;
  VideoKey: string;
  TagKey: string;
  ThemeKey: string;
  TotalKeys: TotalKeys;
  IntegrationKeys: IntegrationKeys;
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
  VideoTagRelationships: IVideoTag[];
  Total: Total;
};

export type Total = {
  Videos: number;
  Tags: number;
};

export type IntegrationKeys = {
  AnilistKeys: AnilistKeys;
};

export type AnilistKeys = {
  AnilistConfigKey: string;
  AnilistAuthKey: string;
};

export type KitaSchema = {
  UserItems: UserItems;
  ApplicationSettings: ApplicationSettings;
};
