import { IVideo } from "@/types/video";
import { ITag } from "@/types/tag";
import { kitaSchema } from "@/data/kitaschema";
import { KitaSchema } from "@/types/kitaschema";

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

        await setItemsForKey<IVideo[]>(kitaSchema.ApplicationSettings.StorageKeys.VideoKey, data.UserItems.Videos);
        await setItemsForKey<ITag[]>(kitaSchema.ApplicationSettings.StorageKeys.TagKey, data.UserItems.Tags);
        await setItemsForKey<boolean>(
          kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey,
          data.ApplicationSettings.IsApplicationEnabled
        );

        await setItemsForKey<number>(kitaSchema.ApplicationSettings.StorageKeys.TotalKeys.Videos, data.UserItems.Total.Videos);
        await setItemsForKey<number>(kitaSchema.ApplicationSettings.StorageKeys.TotalKeys.Tags, data.UserItems.Total.Tags);

        // pause for 3 seconds to allow the data to be saved
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
