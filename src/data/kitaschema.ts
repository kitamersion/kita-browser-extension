import { KitaSchema } from "@/types/kitaschema";

export const kitaSchema: KitaSchema = {
  UserItems: {
    Videos: [],
    Tags: [],
  },
  ApplicationSettings: {
    IsReady: false, // @todo: implement
    IsApplicationEnabled: true, // default enabled
    StorageKeys: {
      ApplicationEnabledKey: "kita_application_enabled",
      VideoKey: "kita_video_logs",
      TagKey: "kita_tag",
    },
  },
};
