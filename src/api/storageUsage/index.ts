import db from "@/db";
import {
  OBJECT_STORE_ANILIST_CACHE,
  OBJECT_STORE_AUTO_TAG,
  OBJECT_STORE_SERIES_MAPPINGS,
  OBJECT_STORE_SYNC_META,
  OBJECT_STORE_TAGS,
  OBJECT_STORE_VIDEOS,
  OBJECT_STORE_VIDEO_TAGS,
} from "@/db/schema";
import { SETTINGS } from "@/api/settings";
import { logger } from "@kitamersion/kita-logging";

export interface StorageBucket {
  name: string;
  bytes: number;
}

export interface StorageUsageSummary {
  buckets: StorageBucket[];
  totalBytes: number;
}

const VIDEOS_AND_TAGS_LOCAL_KEYS = [
  SETTINGS.storage.video.key,
  SETTINGS.storage.tag.key,
  SETTINGS.application.defaultTagsInitialized.key,
  SETTINGS.statistics.totalVideos.key,
  SETTINGS.statistics.totalDuration.key,
  SETTINGS.statistics.totalTags.key,
];

const ANILIST_INTEGRATION_LOCAL_KEYS = [
  SETTINGS.integrations.anilist.configKey.key,
  SETTINGS.integrations.anilist.authKey.key,
  SETTINGS.integrations.anilist.authStatus.key,
  SETTINGS.integrations.anilist.autoSync.key,
  SETTINGS.integrations.anilist.pendingSync.key,
];

const SYNC_LOCAL_KEYS = [
  SETTINGS.kitaSync.paused.key,
  SETTINGS.kitaSync.lastSyncedAccountId.key,
  SETTINGS.kitaSync.pendingRekeyNotice.key,
  SETTINGS.kitaSync.lastSyncStats.key,
  SETTINGS.kitaSync.syncIntervalMinutes.key,
];

const GENERAL_SETTINGS_LOCAL_KEYS = [
  SETTINGS.application.enabled.key,
  SETTINGS.application.contentScriptEnabled.key,
  SETTINGS.application.theme.key,
  SETTINGS.sources.crunchyroll.autoTrack.key,
  SETTINGS.sources.crunchyroll.autoSync.key,
  SETTINGS.sources.youtube.autoTrack.key,
  SETTINGS.sources.youtube.autoSync.key,
];

function getBytesInUse(keys: string[] | null): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.getBytesInUse(keys, (bytes) => resolve(bytes));
    } catch (error) {
      logger.error(`getBytesInUse error: ${error}`);
      reject(error);
    }
  });
}

export async function getStorageUsageSummary(): Promise<StorageUsageSummary> {
  const [
    videosStoreBytes,
    tagsStoreBytes,
    videoTagsStoreBytes,
    autoTagStoreBytes,
    seriesMappingsStoreBytes,
    anilistCacheStoreBytes,
    syncMetaStoreBytes,
    videosAndTagsLocalBytes,
    anilistIntegrationLocalBytes,
    syncLocalBytes,
    generalSettingsLocalBytes,
    totalLocalBytes,
  ] = await Promise.all([
    db.getObjectStoreByteSize(OBJECT_STORE_VIDEOS),
    db.getObjectStoreByteSize(OBJECT_STORE_TAGS),
    db.getObjectStoreByteSize(OBJECT_STORE_VIDEO_TAGS),
    db.getObjectStoreByteSize(OBJECT_STORE_AUTO_TAG),
    db.getObjectStoreByteSize(OBJECT_STORE_SERIES_MAPPINGS),
    db.getObjectStoreByteSize(OBJECT_STORE_ANILIST_CACHE),
    db.getObjectStoreByteSize(OBJECT_STORE_SYNC_META),
    getBytesInUse(VIDEOS_AND_TAGS_LOCAL_KEYS),
    getBytesInUse(ANILIST_INTEGRATION_LOCAL_KEYS),
    getBytesInUse(SYNC_LOCAL_KEYS),
    getBytesInUse(GENERAL_SETTINGS_LOCAL_KEYS),
    getBytesInUse(null),
  ]);

  const buckets: StorageBucket[] = [
    {
      name: "Videos & Tags",
      bytes: videosStoreBytes + tagsStoreBytes + videoTagsStoreBytes + autoTagStoreBytes + videosAndTagsLocalBytes,
    },
    { name: "AniList Cache", bytes: anilistCacheStoreBytes },
    { name: "AniList Integration", bytes: anilistIntegrationLocalBytes },
    { name: "Series Mappings", bytes: seriesMappingsStoreBytes },
    { name: "Sync", bytes: syncMetaStoreBytes + syncLocalBytes },
    { name: "General Settings", bytes: generalSettingsLocalBytes },
  ];

  const explicitlyBucketedLocalBytes = videosAndTagsLocalBytes + anilistIntegrationLocalBytes + syncLocalBytes + generalSettingsLocalBytes;
  const otherLocalBytes = Math.max(0, totalLocalBytes - explicitlyBucketedLocalBytes);
  if (otherLocalBytes > 0) {
    buckets.push({ name: "Other", bytes: otherLocalBytes });
  }

  const indexedDbTotalBytes =
    videosStoreBytes +
    tagsStoreBytes +
    videoTagsStoreBytes +
    autoTagStoreBytes +
    seriesMappingsStoreBytes +
    anilistCacheStoreBytes +
    syncMetaStoreBytes;

  return { buckets, totalBytes: indexedDbTotalBytes + totalLocalBytes };
}
