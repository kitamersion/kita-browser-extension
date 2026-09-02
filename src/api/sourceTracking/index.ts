import { settingsManager } from "@/api/settings/manager";
import { SETTINGS } from "@/api/settings/definitions";
import { SettingDefinition } from "@/api/settings/types";
import { SourceAutoSyncConfig, SourceAutoTrackConfig } from "@/types/integrations/sourceTracking";
import { SourcePlatform } from "@/types/integrations/seriesMapping";

const DEFAULT_AUTO_TRACK_CONFIG: SourceAutoTrackConfig = { enabled: false, watchPercentage: 80 };
const DEFAULT_AUTO_SYNC_CONFIG: SourceAutoSyncConfig = { enabled: false };

const AUTO_TRACK_SETTINGS: Partial<Record<SourcePlatform, SettingDefinition<SourceAutoTrackConfig>>> = {
  crunchyroll: SETTINGS.sources.crunchyroll.autoTrack,
  youtube: SETTINGS.sources.youtube.autoTrack,
};

const AUTO_SYNC_SETTINGS: Partial<Record<SourcePlatform, SettingDefinition<SourceAutoSyncConfig>>> = {
  crunchyroll: SETTINGS.sources.crunchyroll.autoSync,
  youtube: SETTINGS.sources.youtube.autoSync,
};

export const isAutoTrackSupported = (platform: SourcePlatform): boolean => platform in AUTO_TRACK_SETTINGS;

export const getSourceAutoTrackConfig = async (platform: SourcePlatform): Promise<SourceAutoTrackConfig> => {
  const setting = AUTO_TRACK_SETTINGS[platform];
  if (!setting) return DEFAULT_AUTO_TRACK_CONFIG;
  return settingsManager.get(setting);
};

export const setSourceAutoTrackConfig = async (platform: SourcePlatform, config: SourceAutoTrackConfig): Promise<void> => {
  const setting = AUTO_TRACK_SETTINGS[platform];
  if (!setting) return;
  await settingsManager.set(setting, config);
};

export const getSourceAutoSyncConfig = async (platform: SourcePlatform): Promise<SourceAutoSyncConfig> => {
  const setting = AUTO_SYNC_SETTINGS[platform];
  if (!setting) return DEFAULT_AUTO_SYNC_CONFIG;
  return settingsManager.get(setting);
};

export const setSourceAutoSyncConfig = async (platform: SourcePlatform, config: SourceAutoSyncConfig): Promise<void> => {
  const setting = AUTO_SYNC_SETTINGS[platform];
  if (!setting) return;
  await settingsManager.set(setting, config);
};
