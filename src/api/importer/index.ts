import { IVideo } from "@/types/video";
import { ITag } from "@/types/tag";
import { kitaSchema } from "@/data/kitaschema";
import { KitaSchema } from "@/types/kitaschema";
import IndexedDB from "@/db/index";
import { calculateTotalDuration } from "../statistics";

const ENV = process.env.APPLICATION_ENVIRONMENT;
const ON_SAVE_TIMEOUT_MS = 3000; // 3 seconds

const setItemsForKey = async <T>(key: string, items: T) => {
  if (ENV === "dev") {
    localStorage.setItem(key, JSON.stringify(items, null, 2));
    console.log(`importing items for key: ${key}`);
    return;
  }

  const data: { [key: string]: T } = {};
  data[key] = items;
  chrome.storage.local.set(data, () => {
    console.log(`importing items for key: ${key}`);
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
        videosToAdd.forEach(async (video: IVideo) => {
          await IndexedDB.addVideo(video);
        });

        const tagsToAdd = data.UserItems.Tags;
        tagsToAdd.forEach(async (tag: ITag) => {
          await IndexedDB.addTag({ id: tag.id, name: tag.name, created_at: tag.created_at });
        });

        const videoTagRelationshipsToAdd = data.UserItems.VideoTagRelationships;
        videoTagRelationshipsToAdd.forEach(async (relationship) => {
          await IndexedDB.addVideoTag(relationship);
        });

        await setItemsForKey<boolean>(
          kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey,
          data.ApplicationSettings.IsApplicationEnabled
        );

        await setItemsForKey<number>(
          kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.VideoStatisticsKeys.TotalVideosKey,
          videosToAdd.length
        );

        const totalDurationSeconds = calculateTotalDuration(videosToAdd);
        await setItemsForKey<number>(
          kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.VideoStatisticsKeys.TotalDurationSecondsKey,
          totalDurationSeconds
        );

        await setItemsForKey<number>(
          kitaSchema.ApplicationSettings.StorageKeys.StatisticsKeys.TagStatisticsKeys.TotalTagsKey,
          tagsToAdd.length
        );
        // pause for 3 seconds to allow data to be saved
        await new Promise((resolve) => setTimeout(resolve, ON_SAVE_TIMEOUT_MS));

        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export { importFromJSON };
