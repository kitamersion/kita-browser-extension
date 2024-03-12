import { v4 as uuidv4 } from "uuid";
import { kitaSchema } from "../videostorage";
import { Callback } from "@/types/callback";
import { ITag } from "@/types/tag";

const TAG_KEY = kitaSchema.ApplicationSettings.StorageKeys.TagKey;
const ENV = process.env.APPLICATION_ENVIRONMENT;

// GET_BY_ID
const getTagById = (id: string, tags: ITag[]) => {
  return tags.find((t) => t.id === id) ?? null;
};

// GET_ALL
const getTags = (callback: Callback<ITag[]>) => {
  chrome.storage.local.get(TAG_KEY, (data) => {
    const items: ITag[] = data?.[TAG_KEY] || [];
    console.log(`Get all tags: ${items.length}`);
    callback(items);
  });
};

// SET
const setTag = (name: string, callback: Callback<ITag>) => {
  if (!name) {
    console.error("Tag name can not be empty or null");
    return;
  }
  getTags((data) => {
    const newTag: ITag = { id: uuidv4(), name: name };
    const localTags = data;
    localTags.push(newTag);

    if (ENV === "dev") {
      console.log("setting single tag");
      localStorage.setItem(TAG_KEY, JSON.stringify(localTags));
      callback(newTag);
      return;
    }

    chrome.storage.local.set({ [TAG_KEY]: localTags }, () => {
      console.log("setting single tag");
      callback(newTag);
    });
  });
};

const setTags = (tags: ITag[], callback: Callback<null>) => {
  if (ENV === "dev") {
    console.log("setting tags");
    localStorage.setItem(TAG_KEY, JSON.stringify(tags));
    callback(null);
    return;
  }

  chrome.storage.local.set({ [TAG_KEY]: tags }, () => {
    console.log("setting tags");
    callback(null);
  });
};

// UPDATE
const updateTagById = (id: string, tagNext: ITag, tags: ITag[], callback: Callback<ITag[]>) => {
  const updatedTag = tags.map((t) => {
    if (t.id === id) {
      return { ...t, ...tagNext };
    }
    return t;
  });

  if (ENV === "dev") {
    console.log("updating tag with id: ", id);
    localStorage.setItem(TAG_KEY, JSON.stringify(updatedTag));
    callback(updatedTag);
    return;
  }

  chrome.storage.local.set({ [TAG_KEY]: updatedTag }, () => {
    console.log("updating tag with id: ", id);
    callback(updatedTag);
  });
};

// DELETE_BY_ID
const deleteTagById = (id: string, tags: ITag[], callback: Callback<ITag[]>) => {
  const localTags = tags;
  const index = localTags.findIndex((t) => t.id === id);
  if (index === -1) {
    console.warn(`tag with id ${id} not found.`);
    callback(localTags);
    return;
  }
  localTags.splice(index, 1);

  if (ENV === "dev") {
    console.log("delete tag index: ", index);
    localStorage.setItem(TAG_KEY, JSON.stringify(localTags));
    callback(localTags);
    return;
  }

  chrome.storage.local.set({ [TAG_KEY]: localTags }, () => {
    console.log("delete tag index: ", index);
    callback(localTags);
  });
};

// DELETE
const deleteAllTags = (callback: Callback<null>) => {
  if (ENV === "dev") {
    console.log("deleting all tags");
    localStorage.removeItem(TAG_KEY);
    callback(null);
    return;
  }

  chrome.storage.local.remove(TAG_KEY, () => {
    console.log("deleting all tags");
    callback(null);
  });
};

export { getTagById, getTags, setTag, setTags, updateTagById, deleteTagById, deleteAllTags };
