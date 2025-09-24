import { SettingDefinition } from "./types";
import { logger } from "@kitamersion/kita-logging";

class SettingsManager {
  /**
   * Get a setting value from storage
   */
  async get<T>(setting: SettingDefinition<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(setting.key, (data) => {
          const value = data?.[setting.key];

          // Return default value if not found or invalid
          if (value === undefined || value === null) {
            resolve(setting.defaultValue);
            return;
          }

          // Validate if validator is provided
          if (setting.validator && !setting.validator(value)) {
            (async () => {
              await logger.warn(`Invalid value for setting ${setting.key}, using default`);
            })();
            resolve(setting.defaultValue);
            return;
          }

          resolve(value);
        });
      } catch (error) {
        (async () => {
          await logger.error(`Error getting setting ${setting.key}: ${error}`);
        })();
        reject(error);
      }
    });
  }

  /**
   * Set a setting value in storage
   */
  async set<T>(setting: SettingDefinition<T>, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Validate value if validator is provided
        if (setting.validator && !setting.validator(value)) {
          const error = new Error(`Invalid value for setting ${setting.key}`);
          (async () => {
            await logger.error(error.message);
          })();
          reject(error);
          return;
        }

        const data: { [key: string]: T } = {};
        data[setting.key] = value;

        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            (async () => {
              await logger.info(`Setting ${setting.key} updated`);
            })();
            resolve();
          }
        });
      } catch (error) {
        (async () => {
          await logger.error(`Error setting ${setting.key}: ${error}`);
        })();
        reject(error);
      }
    });
  }

  /**
   * Get multiple settings at once
   */
  async getMultiple<T extends Record<string, SettingDefinition>>(
    settings: T
  ): Promise<{ [K in keyof T]: T[K] extends SettingDefinition<infer U> ? U : never }> {
    const keys = Object.values(settings).map((setting) => setting.key);

    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(keys, (data) => {
          const result = {} as any;

          for (const [name, setting] of Object.entries(settings)) {
            const value = data?.[setting.key];

            if (value === undefined || value === null) {
              result[name] = setting.defaultValue;
            } else if (setting.validator && !setting.validator(value)) {
              logger.warn(`Invalid value for setting ${setting.key}, using default`);
              result[name] = setting.defaultValue;
            } else {
              result[name] = value;
            }
          }

          resolve(result);
        });
      } catch (error) {
        logger.error(`Error getting multiple settings: ${error}`);
        reject(error);
      }
    });
  }

  /**
   * Set multiple settings at once
   */
  async setMultiple<T extends Record<string, { setting: SettingDefinition<any>; value: any }>>(updates: T): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const data: { [key: string]: any } = {};

        // Validate all values first
        for (const [, { setting, value }] of Object.entries(updates)) {
          if (setting.validator && !setting.validator(value)) {
            const error = new Error(`Invalid value for setting ${setting.key}`);
            logger.error(error.message);
            reject(error);
            return;
          }
          data[setting.key] = value;
        }

        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            logger.info(`Updated ${Object.keys(updates).length} settings`);
            resolve();
          }
        });
      } catch (error) {
        logger.error(`Error setting multiple settings: ${error}`);
        reject(error);
      }
    });
  }

  /**
   * Reset a setting to its default value
   */
  async reset<T>(setting: SettingDefinition<T>): Promise<void> {
    return this.set(setting, setting.defaultValue);
  }

  /**
   * Remove a setting from storage
   */
  async remove<T>(setting: SettingDefinition<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.remove(setting.key, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            logger.info(`Removed setting ${setting.key}`);
            resolve();
          }
        });
      } catch (error) {
        logger.error(`Error removing setting ${setting.key}: ${error}`);
        reject(error);
      }
    });
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();
export default settingsManager;
