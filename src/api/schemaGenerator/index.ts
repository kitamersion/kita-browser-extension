import { KitaSchema } from "@/types/kitaschema";
import { ITag } from "@/types/tag";
import { IVideo } from "@/types/video";
import { kitaSchema } from "../videostorage";
import { getItemsFromKey } from "../exporter";

const getKitaSchema = async (): Promise<KitaSchema> => {
  const videos = await getItemsFromKey<IVideo[]>(kitaSchema.ApplicationSettings.StorageKeys.VideoKey);
  const tags = await getItemsFromKey<ITag[]>(kitaSchema.ApplicationSettings.StorageKeys.TagKey);
  const isApplicationEnabled = await getItemsFromKey<boolean>(kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey);

  return {
    UserItems: {
      Videos: videos ?? [],
      Tags: tags ?? [],
    },
    ApplicationSettings: {
      IsReady: false, // @todo: implement
      IsApplicationEnabled: isApplicationEnabled ?? true,
      StorageKeys: {
        ApplicationEnabledKey: kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey,
        VideoKey: kitaSchema.ApplicationSettings.StorageKeys.VideoKey,
        TagKey: kitaSchema.ApplicationSettings.StorageKeys.TagKey,
        ThemeKey: kitaSchema.ApplicationSettings.StorageKeys.ThemeKey,
      },
    },
  };
};

export { getKitaSchema };
