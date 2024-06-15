import { KitaSchema } from "@/types/kitaschema";

export const kitaSchema: KitaSchema = {
  UserItems: {
    Videos: [],
    Tags: [],
    VideoTagRelationships: [],
    AutoTags: [],
  },
  ApplicationSettings: {
    IsReady: false, // @todo: implement
    IsApplicationEnabled: false, // default disabled application will decide when its ready
    IsContentScriptEnabled: true, // default enabled @todo: make this configurable
    AnilistSyncMedia: true, // default enabled (will allow user to disable)
    StorageKeys: {
      ApplicationEnabledKey: "kitamersion_application_enabled",
      ContentScriptEnabledKey: "kitamersion_content_script_enabled",
      DefaultTagsInitializedKey: "kitamersion_default_tags_initialized",
      VideoKey: "kitamersion_video_logs",
      TagKey: "kitamersion_tag",
      ThemeKey: "kitamersion_theme",
      IntegrationKeys: {
        AnilistKeys: {
          AuthStatus: "kitamersion_anilist_auth_status",
          AnilistAuthKey: "kitamersion_anilist_auth",
          AnilistConfigKey: "kitamersion_anilist_config",
          AnilistAutoSyncMediaKey: "kitamersion_anilist_auto_sync_media",
        },
        MyAnimeListKeys: {
          AuthStatus: "kitamersion_myanimelist_auth_status",
          MyAnimeListAuthKey: "kitamersion_myanimelist_auth",
          MyAnimeListConfigKey: "kitamersion_myanimelist_config",
          MyAnimeListAutoSyncMediaKey: "kitamersion_myanimelist_auto_sync_media",
        },
      },
      StatisticsKeys: {
        VideoStatisticsKeys: {
          TotalVideosKey: "kitamersion_total_videos",
          TotalDurationSecondsKey: "kitamersion_total_duration_seconds",
        },
        TagStatisticsKeys: {
          TotalTagsKey: "kitamersion_total_tags",
        },
      },
    },
  },
  Statistics: {
    VideoStatistics: {
      TotalVideos: 0,
      TotalDurationSeconds: 0,
    },
    TagStatistics: {
      TotalTags: 0,
    },
  },
};
