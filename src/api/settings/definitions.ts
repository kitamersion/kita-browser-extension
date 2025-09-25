import { SettingDefinition } from "./types";
import { AuthStatus } from "@/types/kitaschema";

// Validators
const isBooleanValidator = (value: any): value is boolean => typeof value === "boolean";
const isNumberValidator = (value: any): value is number => typeof value === "number";
const isStringValidator = (value: any): value is string => typeof value === "string";
const isAuthStatusValidator = (value: any): value is AuthStatus =>
  ["initial", "pending", "authorized", "unauthorized", "error"].includes(value);

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
