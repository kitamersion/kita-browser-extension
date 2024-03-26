import { IVideo } from "@/types/video";
import { ITag } from "@/types/tag";
import { kitaSchema } from "@/data/kitaschema";
import { KitaSchema } from "@/types/kitaschema";

const ENV = process.env.APPLICATION_ENVIRONMENT;

const setItemsForKey = async <T>(key: string, items: T) => {
  if (ENV === "dev") {
    localStorage.setItem(key, JSON.stringify(items));
    console.log(`import items for key: ${key}`);
    return;
  }

  const data: { [key: string]: T } = {};
  data[key] = items;
  chrome.storage.local.set(data, () => {
    console.log(`import items for key: ${key}`);
  });
};

const importFromJSON = (file: File) => {
  const reader = new FileReader();
  reader.onload = async (event) => {
    const text = event.target?.result as string;
    const data: KitaSchema = JSON.parse(text);

    await setItemsForKey<IVideo[]>(kitaSchema.ApplicationSettings.StorageKeys.VideoKey, data.UserItems.Videos);
    await setItemsForKey<ITag[]>(kitaSchema.ApplicationSettings.StorageKeys.TagKey, data.UserItems.Tags);
    await setItemsForKey<boolean>(
      kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey,
      data.ApplicationSettings.IsApplicationEnabled
    );
  };
  reader.readAsText(file);
};

export { importFromJSON };
