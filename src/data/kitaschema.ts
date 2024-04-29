import { KitaSchema } from "@/types/kitaschema";

export const kitaSchema: KitaSchema = {
  UserItems: {
    Videos: [],
    Tags: [],
    VideoTagRelationships: [],
    Total: {
      Videos: 0,
      Tags: 0,
    },
  },
  ApplicationSettings: {
    IsReady: false, // @todo: implement
    IsApplicationEnabled: true, // default enabled
    StorageKeys: {
      ApplicationEnabledKey: "kitamersion_application_enabled",
      VideoKey: "kitamersion_video_logs",
      TagKey: "kitamersion_tag",
      ThemeKey: "kitamersion_theme",
      TotalKeys: {
        Videos: "kitamersion_total_videos",
        Tags: "kitamersion_total_tags",
      },
      IntegrationKeys: {
        AnilistKeys: {
          AnilistAuthKey: "kitamersion_anilist_auth",
          AnilistConfigKey: "kitamersion_anilist_config",
          AuthStatus: "kitamersion_anilist_auth_status",
        },
      },
    },
  },
};
