import { KitaSchema } from "@/types/kitaschema";
import { kitaSchema } from "../videostorage";
import { getItemsFromKey } from "../exporter";
import IndexedDB from "@/db/index";

const getKitaSchema = async (): Promise<KitaSchema> => {
  const videos = await IndexedDB.getAllVideos();
  const tags = await IndexedDB.getAllTags();
  const videoTagRelationships = await IndexedDB.getAllVideoTags();
  const isApplicationEnabled = await getItemsFromKey<boolean>(kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey);
  const totalVideos = await getItemsFromKey<number>(kitaSchema.ApplicationSettings.StorageKeys.TotalKeys.Videos);
  const totalTags = await getItemsFromKey<number>(kitaSchema.ApplicationSettings.StorageKeys.TotalKeys.Tags);

  return {
    UserItems: {
      Videos: videos ?? [],
      Tags: tags ?? [],
      VideoTagRelationships: videoTagRelationships ?? [],
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
        IntegrationKeys: {
          AnilistKeys: {
            AnilistAuthKey: kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistAuthKey,
            AnilistConfigKey: kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistConfigKey,
            AuthStatus: kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AuthStatus,
          },
        },
      },
    },
  };
};

export { getKitaSchema };
