import { IVideo } from "@/types/video";
import { ITag } from "@/types/tag";
import { kitaSchema } from "@/data/kitaschema";
import { KitaSchema } from "@/types/kitaschema";
import IndexedDB from "@/db/index";
import { calculateTotalDuration } from "../statistics";
import { generateUniqueCode } from "@/utils";
import logger from "@/config/logger";

const ON_SAVE_TIMEOUT_MS = 3000; // 3 seconds

const setItemsForKey = async <T>(key: string, items: T) => {
  const data: { [key: string]: T } = {};
  data[key] = items;
  chrome.storage.local.set(data, () => {
    logger.info(`importing items for key: ${key}`);
  });
};

const importFromJSON = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data: KitaSchema = JSON.parse(text);

        const videosToAdd = data.UserItems.Videos;
        if (videosToAdd && videosToAdd.length > 0) {
          videosToAdd.forEach(async (video: IVideo) => {
            if (video.unique_code) {
              await IndexedDB.addVideo(video);
            }

            if (!video.unique_code) {
              const uniqueCode = generateUniqueCode(video.video_title, video.origin);
              await IndexedDB.addVideo({ ...video, unique_code: uniqueCode });
            }
          });
        }

        const tagsToAdd = data.UserItems.Tags;
        if (tagsToAdd && tagsToAdd.length > 0) {
          tagsToAdd.forEach(async (tag: ITag) => {
            await IndexedDB.addTag({ id: tag.id, name: tag.name, created_at: tag.created_at });
          });
        }

        const videoTagRelationshipsToAdd = data.UserItems.VideoTagRelationships;
        if (videoTagRelationshipsToAdd && videoTagRelationshipsToAdd.length > 0) {
          videoTagRelationshipsToAdd.forEach(async (relationship) => {
            await IndexedDB.addVideoTag(relationship);
          });
        }

        const autoTagsToAdd = data.UserItems.AutoTags;
        if (autoTagsToAdd && autoTagsToAdd.length > 0) {
          autoTagsToAdd.forEach(async (autoTag) => {
            await IndexedDB.addAutoTag(autoTag);
          });
        }

        await setItemsForKey<boolean>(
          kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey,
          data.ApplicationSettings.IsApplicationEnabled
        );

        await setItemsForKey<boolean>(
          kitaSchema.ApplicationSettings.StorageKeys.ContentScriptEnabledKey,
          data.ApplicationSettings.IsContentScriptEnabled
        );

        await setItemsForKey<boolean>(
          kitaSchema.ApplicationSettings.StorageKeys.IntegrationKeys.AnilistKeys.AnilistAutoSyncMediaKey,
          data.ApplicationSettings.AnilistSyncMedia
        );

        await setItemsForKey<number>(
          kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.VideoStatisticsKeys.TotalVideosKey,
          videosToAdd.length ?? 0
        );

        const totalDurationSeconds = calculateTotalDuration(videosToAdd);
        await setItemsForKey<number>(
          kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.VideoStatisticsKeys.TotalDurationSecondsKey,
          totalDurationSeconds ?? 0
        );

        await setItemsForKey<number>(
          kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.TagStatisticsKeys.TotalTagsKey,
          tagsToAdd.length ?? 0
        );
        // pause for 3 seconds to allow data to be saved
        await new Promise((resolve) => setTimeout(resolve, ON_SAVE_TIMEOUT_MS));

        resolve();
      } catch (error) {
        logger.error(`error while importing data: ${error}`);
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export { importFromJSON };
