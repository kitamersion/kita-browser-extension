import { KitaSchema } from "@/types/kitaschema";

export const kitaSchema: KitaSchema = {
  UserItems: {
    Videos: [],
  },
  ApplicationSettings: {
    IsReady: false,
    StorageKeys: {
      VideoKey: "kita_video_logs",
    },
  },
};
