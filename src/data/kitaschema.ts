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
      ApplicationEnabledKey: "kita_application_enabled",
      VideoKey: "kita_video_logs",
      TagKey: "kita_tag",
      ThemeKey: "kita_theme",
      TotalKeys: {
        Videos: "kita_total_videos",
        Tags: "kita_total_tags",
      },
    },
  },
};
