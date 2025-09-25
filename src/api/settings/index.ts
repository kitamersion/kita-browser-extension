// Main exports
export { settingsManager } from "./manager";
export { statisticsService } from "./statistics";
export { SETTINGS } from "./definitions";
export type { SettingDefinition, SettingsGroup } from "./types";

// Re-export for convenience
import { settingsManager } from "./manager";
export default settingsManager;
