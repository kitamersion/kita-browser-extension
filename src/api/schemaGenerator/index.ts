import { KitaSchema } from "@/types/kitaschema";
import { kitaSchema } from "../videostorage";
import { getItemsFromKey } from "../exporter";
import IndexedDB from "@/db/index";

const getKitaSchema = async (): Promise<KitaSchema> => {
  const videos = await IndexedDB.getAllVideos();
  const tags = await IndexedDB.getAllTags();
  const videoTagRelationships = await IndexedDB.getAllVideoTags();
  const isApplicationEnabled = await getItemsFromKey<boolean>(kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey);
  const totalVideos = await getItemsFromKey<number>(
    kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.VideoStatisticsKeys.TotalVideosKey
  );
  const totalTags = await getItemsFromKey<number>(kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.TagStatisticsKeys.TotalTagsKey);
  const totalDurationSeconds = await getItemsFromKey<number>(
    kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.VideoStatisticsKeys.TotalDurationSecondsKey
  );

  return {
    UserItems: {
      Videos: videos ?? [],
      Tags: tags ?? [],
      VideoTagRelationships: videoTagRelationships ?? [],
    },
    ApplicationSettings: {
      IsReady: false, // @todo: implement
      IsApplicationEnabled: isApplicationEnabled ?? true,
      StorageKeys: {
        ApplicationEnabledKey: kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey,
        VideoKey: kitaSchema.ApplicationSettings.StorageKeys.VideoKey,
        TagKey: kitaSchema.ApplicationSettings.StorageKeys.TagKey,
        ThemeKey: kitaSchema.ApplicationSettings.StorageKeys.ThemeKey,
        IntegrationKeys: {
          AnilistKeys: {
            AnilistAuthKey: kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistAuthKey,
            AnilistConfigKey: kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistConfigKey,
            AuthStatus: kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AuthStatus,
          },
        },
        StatisticsKeys: {
          VideoStatisticsKeys: {
            TotalVideosKey: kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.VideoStatisticsKeys.TotalVideosKey,
            TotalDurationSecondsKey: kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.VideoStatisticsKeys.TotalDurationSecondsKey,
          },
          TagStatisticsKeys: {
            TotalTagsKey: kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.TagStatisticsKeys.TotalTagsKey,
          },
        },
      },
    },
    Statistics: {
      VideoStatistics: {
        TotalVideos: totalVideos ?? 0,
        TotalDurationSeconds: totalDurationSeconds ?? 0,
      },
      TagStatistics: {
        TotalTags: totalTags ?? 0,
      },
    },
  };
};

export { getKitaSchema };
