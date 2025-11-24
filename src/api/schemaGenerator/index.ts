import { KitaSchema } from "@/types/kitaschema";
import { settingsManager, statisticsService, SETTINGS } from "@/api/settings";
import IndexedDB from "@/db/index";

const getKitaSchema = async (): Promise<KitaSchema> => {
  // Get all data in parallel for better performance
  const [videos, tags, videoTagRelationships, autoTags, seriesMappings] = await Promise.all([
    IndexedDB.getAllVideos(),
    IndexedDB.getAllTags(),
    IndexedDB.getAllVideoTags(),
    IndexedDB.getAllAutoTags(),
    IndexedDB.getAllSeriesMappings(),
  ]);

  // Get application settings using the new settings manager
  const applicationSettings = await settingsManager.getMultiple({
    isApplicationEnabled: SETTINGS.application.enabled,
    isContentScriptEnabled: SETTINGS.application.contentScriptEnabled,
    anilistSyncMedia: SETTINGS.integrations.anilist.autoSync,
  });

  // Get statistics (computed from actual data)
  const statistics = await statisticsService.getAll();

  return {
    UserItems: {
      Videos: videos ?? [],
      Tags: tags ?? [],
      VideoTagRelationships: videoTagRelationships ?? [],
      AutoTags: autoTags ?? [],
      SeriesMappings: seriesMappings ?? [],
    },
    ApplicationSettings: {
      IsReady: false, // @todo: implement
      IsApplicationEnabled: applicationSettings.isApplicationEnabled,
      IsContentScriptEnabled: applicationSettings.isContentScriptEnabled,
      AnilistSyncMedia: applicationSettings.anilistSyncMedia,
      StorageKeys: {
        ApplicationEnabledKey: SETTINGS.application.enabled.key,
        ContentScriptEnabledKey: SETTINGS.application.contentScriptEnabled.key,
        DefaultTagsInitializedKey: SETTINGS.application.defaultTagsInitialized.key,
        VideoKey: SETTINGS.storage.video.key,
        TagKey: SETTINGS.storage.tag.key,
        ThemeKey: SETTINGS.application.theme.key,
        IntegrationKeys: {
          AnilistKeys: {
            AnilistAuthKey: SETTINGS.integrations.anilist.authKey.key,
            AnilistConfigKey: SETTINGS.integrations.anilist.configKey.key,
            AuthStatus: SETTINGS.integrations.anilist.authStatus.key,
            AnilistAutoSyncMediaKey: SETTINGS.integrations.anilist.autoSync.key,
          },
        },
        StatisticsKeys: {
          VideoStatisticsKeys: {
            TotalVideosKey: SETTINGS.statistics.totalVideos.key,
            TotalDurationSecondsKey: SETTINGS.statistics.totalDuration.key,
          },
          TagStatisticsKeys: {
            TotalTagsKey: SETTINGS.statistics.totalTags.key,
          },
        },
      },
    },
    Statistics: statistics,
  };
};

export { getKitaSchema };
