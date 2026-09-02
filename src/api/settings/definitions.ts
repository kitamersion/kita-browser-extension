import { SettingDefinition } from "./types";
import { AuthStatus } from "@/types/kitaschema";
import { SourceAutoSyncConfig, SourceAutoTrackConfig } from "@/types/integrations/sourceTracking";
import { PendingAnilistSync } from "@/types/integrations/seriesMapping";

// Validators
const isBooleanValidator = (value: any): value is boolean => typeof value === "boolean";
const isNumberValidator = (value: any): value is number => typeof value === "number";
const isStringValidator = (value: any): value is string => typeof value === "string";
const isAuthStatusValidator = (value: any): value is AuthStatus =>
  ["initial", "pending", "authorized", "unauthorized", "error"].includes(value);
const isSourceAutoTrackConfigValidator = (value: any): value is SourceAutoTrackConfig =>
  typeof value === "object" &&
  value !== null &&
  typeof value.enabled === "boolean" &&
  typeof value.watchPercentage === "number" &&
  value.watchPercentage >= 1 &&
  value.watchPercentage <= 100;
const isSourceAutoSyncConfigValidator = (value: any): value is SourceAutoSyncConfig =>
  typeof value === "object" && value !== null && typeof value.enabled === "boolean";
const isPendingAnilistSyncArrayValidator = (value: any): value is PendingAnilistSync[] => Array.isArray(value);

export const SETTINGS = {
  application: {
    enabled: {
      key: "kitamersion_application_enabled",
      defaultValue: false,
      validator: isBooleanValidator,
    } as SettingDefinition<boolean>,
    contentScriptEnabled: {
      key: "kitamersion_content_script_enabled",
      defaultValue: true,
      validator: isBooleanValidator,
    } as SettingDefinition<boolean>,
    defaultTagsInitialized: {
      key: "kitamersion_default_tags_initialized",
      defaultValue: false,
      validator: isBooleanValidator,
    } as SettingDefinition<boolean>,
    theme: {
      key: "kitamersion_theme",
      defaultValue: "light",
      validator: isStringValidator,
    } as SettingDefinition<string>,
  },
  integrations: {
    anilist: {
      autoSync: {
        key: "kitamersion_anilist_auto_sync_media",
        defaultValue: true,
        validator: isBooleanValidator,
      } as SettingDefinition<boolean>,
      authStatus: {
        key: "kitamersion_anilist_auth_status",
        defaultValue: "initial" as AuthStatus,
        validator: isAuthStatusValidator,
      } as SettingDefinition<AuthStatus>,
      authKey: {
        key: "kitamersion_anilist_auth",
        defaultValue: "",
        validator: isStringValidator,
      } as SettingDefinition<string>,
      configKey: {
        key: "kitamersion_anilist_config",
        defaultValue: "",
        validator: isStringValidator,
      } as SettingDefinition<string>,
      pendingSync: {
        key: "kitamersion_anilist_pending_sync",
        defaultValue: [],
        validator: isPendingAnilistSyncArrayValidator,
      } as SettingDefinition<PendingAnilistSync[]>,
    },
  },
  sources: {
    crunchyroll: {
      autoTrack: {
        key: "kitamersion_source_crunchyroll_autotrack",
        defaultValue: { enabled: false, watchPercentage: 80 },
        validator: isSourceAutoTrackConfigValidator,
      } as SettingDefinition<SourceAutoTrackConfig>,
      autoSync: {
        key: "kitamersion_source_crunchyroll_autosync",
        defaultValue: { enabled: false },
        validator: isSourceAutoSyncConfigValidator,
      } as SettingDefinition<SourceAutoSyncConfig>,
    },
    youtube: {
      autoTrack: {
        key: "kitamersion_source_youtube_autotrack",
        defaultValue: { enabled: false, watchPercentage: 80 },
        validator: isSourceAutoTrackConfigValidator,
      } as SettingDefinition<SourceAutoTrackConfig>,
      autoSync: {
        key: "kitamersion_source_youtube_autosync",
        defaultValue: { enabled: false },
        validator: isSourceAutoSyncConfigValidator,
      } as SettingDefinition<SourceAutoSyncConfig>,
    },
  },
  storage: {
    video: {
      key: "kitamersion_video_logs",
      defaultValue: "",
      validator: isStringValidator,
    } as SettingDefinition<string>,
    tag: {
      key: "kitamersion_tag",
      defaultValue: "",
      validator: isStringValidator,
    } as SettingDefinition<string>,
  },
  statistics: {
    totalVideos: {
      key: "kitamersion_total_videos",
      defaultValue: 0,
      validator: isNumberValidator,
    } as SettingDefinition<number>,
    totalDuration: {
      key: "kitamersion_total_duration_seconds",
      defaultValue: 0,
      validator: isNumberValidator,
    } as SettingDefinition<number>,
    totalTags: {
      key: "kitamersion_total_tags",
      defaultValue: 0,
      validator: isNumberValidator,
    } as SettingDefinition<number>,
  },
} as const;
