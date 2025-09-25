import { logger } from "@kitamersion/kita-logging";

const ENV = process.env.APPLICATION_ENVIRONMENT;

// Development storage helper that logs all operations for easier debugging
export const devStorage = {
  get: (key: string): Promise<any> => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        const value = result[key];
        if (ENV === "dev") {
          logger.info(`🔍 DEV STORAGE GET: ${key} = ${JSON.stringify(value)}`);
        }
        resolve(value);
      });
    });
  },

  set: (key: string, value: any): Promise<void> => {
    return new Promise((resolve) => {
      if (ENV === "dev") {
        logger.info(`💾 DEV STORAGE SET: ${key} = ${JSON.stringify(value)}`);
      }
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },

  remove: (key: string): Promise<void> => {
    return new Promise((resolve) => {
      if (ENV === "dev") {
        logger.info(`🗑️ DEV STORAGE REMOVE: ${key}`);
      }
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  },

  // Debug helper: dump all storage
  dumpAll: (): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        logger.info(`🗂️ DEV STORAGE DUMP ALL: ${JSON.stringify(items, null, 2)}`);
        resolve();
      });
    });
  },
};
