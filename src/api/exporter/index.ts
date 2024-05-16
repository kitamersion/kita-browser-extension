import logger from "@/config/logger";
import { KitaSchema } from "@/types/kitaschema";

const ENV = process.env.APPLICATION_ENVIRONMENT;

const getItemsFromKey = <T>(key: string): Promise<T | null> => {
  return new Promise((resolve, reject) => {
    try {
      if (ENV === "dev") {
        const items = localStorage.getItem(key);
        if (!items) {
          resolve(null);
        } else {
          try {
            const parsedItems = JSON.parse(items);
            resolve(parsedItems as T);
          } catch (error) {
            logger.error(`Error parsing JSON from local storage for key ${key}: ${error}`);
            resolve(null);
          }
        }
      } else {
        chrome.storage.local.get(key, (data) => {
          const items: T = data?.[key] || null;
          resolve(items);
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

const exportToJSON = (data: KitaSchema, fileName: string): Promise<KitaSchema | null> => {
  return new Promise((resolve, reject) => {
    try {
      logger.info("exporting...");
      data.Statistics.VideoStatistics.TotalVideos = data.UserItems.Videos.length ?? 0;
      data.Statistics.VideoStatistics.TotalDurationSeconds = data.Statistics.VideoStatistics.TotalDurationSeconds ?? 0;
      data.Statistics.TagStatistics.TotalTags = data.UserItems.Tags.length ?? 0;
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      // cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

export { getItemsFromKey, exportToJSON };
