import { KitaSchema } from "@/types/kitaschema";

export const kitaSchema: KitaSchema = {
  UserItems: {
    Videos: [],
    Tags: [],
    VideoTagRelationships: [],
  },
  ApplicationSettings: {
    IsReady: false, // @todo: implement
    IsApplicationEnabled: true, // default enabled
    StorageKeys: {
      ApplicationEnabledKey: "kitamersion_application_enabled",
      DefaultTagsInitializedKey: "kitamersion_default_tags_initialized",
      VideoKey: "kitamersion_video_logs",
      TagKey: "kitamersion_tag",
      ThemeKey: "kitamersion_theme",
      IntegrationKeys: {
        AnilistKeys: {
          AnilistAuthKey: "kitamersion_anilist_auth",
          AnilistConfigKey: "kitamersion_anilist_config",
          AuthStatus: "kitamersion_anilist_auth_status",
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
