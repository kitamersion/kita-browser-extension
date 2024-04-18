import { KitaSchema } from "@/types/kitaschema";
import { ITag } from "@/types/tag";
import { IVideo } from "@/types/video";
import { kitaSchema } from "../videostorage";
import { getItemsFromKey } from "../exporter";

const getKitaSchema = async (): Promise<KitaSchema> => {
  const videos = await getItemsFromKey<IVideo[]>(kitaSchema.ApplicationSettings.StorageKeys.VideoKey);
  const tags = await getItemsFromKey<ITag[]>(kitaSchema.ApplicationSettings.StorageKeys.TagKey);
  const isApplicationEnabled = await getItemsFromKey<boolean>(kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey);
  const totalVideos = await getItemsFromKey<number>(kitaSchema.ApplicationSettings.StorageKeys.TotalKeys.Videos);
  const totalTags = await getItemsFromKey<number>(kitaSchema.ApplicationSettings.StorageKeys.TotalKeys.Tags);

  return {
    UserItems: {
      Videos: videos ?? [],
      Tags: tags ?? [],
      Total: {
        Videos: totalVideos ?? 0,
        Tags: totalTags ?? 0,
      },
    },
    ApplicationSettings: {
      IsReady: false, // @todo: implement
      IsApplicationEnabled: isApplicationEnabled ?? true,
      StorageKeys: {
        ApplicationEnabledKey: kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey,
        VideoKey: kitaSchema.ApplicationSettings.StorageKeys.VideoKey,
        TagKey: kitaSchema.ApplicationSettings.StorageKeys.TagKey,
        ThemeKey: kitaSchema.ApplicationSettings.StorageKeys.ThemeKey,
        TotalKeys: {
          Videos: kitaSchema.ApplicationSettings.StorageKeys.TotalKeys.Videos,
          Tags: kitaSchema.ApplicationSettings.StorageKeys.TotalKeys.Tags,
        },
      },
    },
  };
};

export { getKitaSchema };
