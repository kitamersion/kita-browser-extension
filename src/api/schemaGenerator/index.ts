import { KitaSchema } from "@/types/kitaschema";
import { ITag } from "@/types/tag";
import { IVideo } from "@/types/video";
import { kitaSchema } from "../videostorage";
import { getItemsFromKey } from "../exporter";

const getKitaSchema = async (): Promise<KitaSchema> => {
  let videos: IVideo[] | null = null;
  let tags: ITag[] | null = null;
  let isApplicationEnabled: boolean | null = null;

  await getItemsFromKey<IVideo[]>(kitaSchema.ApplicationSettings.StorageKeys.VideoKey, (data) => {
    videos = data;
  });

  await getItemsFromKey<ITag[]>(kitaSchema.ApplicationSettings.StorageKeys.TagKey, (data) => {
    tags = data;
  });

  await getItemsFromKey<boolean>(kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey, (data) => {
    isApplicationEnabled = data;
  });

  return {
    UserItems: {
      Videos: videos ?? [],
      Tags: tags ?? [],
    },
    ApplicationSettings: {
      IsReady: false, // @todo: implement
      IsApplicationEnabled: isApplicationEnabled ?? true,
      StorageKeys: {
        ApplicationEnabledKey: kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey,
        VideoKey: kitaSchema.ApplicationSettings.StorageKeys.VideoKey,
        TagKey: kitaSchema.ApplicationSettings.StorageKeys.TagKey,
      },
    },
  };
};

export { getKitaSchema };
