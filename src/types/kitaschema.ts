import { IAutoTag } from "./autotag";
import { IVideoTag } from "./relationship";
import { ITag } from "./tag";
import { IVideo } from "./video";

export type StorageKeys = {
  ApplicationEnabledKey: string;
  ContentScriptEnabledKey: string;
  DefaultTagsInitializedKey: string;
  VideoKey: string;
  TagKey: string;
  ThemeKey: string;
  IntegrationKeys: IntegrationKeys;
  StatisticsKeys: StatisticsKeys;
};

export type ApplicationSettings = {
  IsReady: boolean;
  IsApplicationEnabled: boolean;
  IsContentScriptEnabled: boolean;
  StorageKeys: StorageKeys;
  AnilistSyncMedia: boolean;
};

export type UserItems = {
  Videos: IVideo[];
  Tags: ITag[];
  VideoTagRelationships: IVideoTag[];
  AutoTags: IAutoTag[];
};

export type IntegrationKeys = {
  AnilistKeys: AnilistKeys;
  MyAnimeListKeys: MyAnimeListKeys;
};

export type AnilistKeys = {
  AnilistConfigKey: string;
  AnilistAuthKey: string;
  AuthStatus: string;
  AnilistAutoSyncMediaKey: string;
};

export type MyAnimeListKeys = {
  MyAnimeListConfigKey: string;
  MyAnimeListAccessToken: string;
  MyAnimeListRefreshToken: string;
  AuthStatus: string;
};

export type StatisticsKeys = {
  VideoStatisticsKeys: VideoStatisticsKeys;
  TagStatisticsKeys: TagStatisticsKeys;
};

export type VideoStatisticsKeys = {
  TotalVideosKey: string;
  TotalDurationSecondsKey: string;
};

export type TagStatisticsKeys = {
  TotalTagsKey: string;
};

export type Statistics = {
  VideoStatistics: VideoStatistics;
  TagStatistics: TagStatistics;
};

export type VideoStatistics = {
  TotalVideos: number;
  TotalDurationSeconds: number;
};

export type TagStatistics = {
  TotalTags: number;
};

export type AuthStatus = "initial" | "pending" | "authorized" | "unauthorized" | "error";

export type KitaSchema = {
  UserItems: UserItems;
  ApplicationSettings: ApplicationSettings;
  Statistics: Statistics;
};
