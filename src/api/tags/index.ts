import { SETTINGS } from "@/api/settings";
import { Callback } from "@/types/callback";
import { ITag } from "@/types/tag";
import { logger } from "@kitamersion/kita-logging";

const TAG_KEY = SETTINGS.storage.tag.key;
const DEFAULT_TAGS_INITIALIZED_KEY = SETTINGS.application.defaultTagsInitialized.key;

// GET_BY_ID
const getTagById = (id: string, tags: ITag[]) => {
  return tags.find((t) => t.id === id) ?? null;
};

// GET_ALL
const getTags = (callback: Callback<ITag[]>) => {
  chrome.storage.local.get(TAG_KEY, (data) => {
    const items: ITag[] = data?.[TAG_KEY] || [];
    logger.info(`get all tags: ${items.length}`);
    callback(items);
  });
};

// SET
const setTag = (name: string, callback: Callback<ITag>) => {
  if (!name) {
    logger.error("tag name can not be empty or null");
    return;
  }
  getTags((data) => {
    const newTag: ITag = { id: self.crypto.randomUUID(), name: name };
    const localTags = data;
    localTags.push(newTag);

    chrome.storage.local.set({ [TAG_KEY]: localTags }, () => {
      logger.info("setting single tag");
      callback(newTag);
    });
  });
};

const setTags = (tags: ITag[], callback: Callback<null>) => {
  chrome.storage.local.set({ [TAG_KEY]: tags }, () => {
    logger.info("setting tags");
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

  chrome.storage.local.set({ [TAG_KEY]: updatedTag }, () => {
    logger.info(`updating tag with id: ${id}`);
    callback(updatedTag);
  });
};

// DELETE_BY_ID
const deleteTagById = (id: string, tags: ITag[], callback: Callback<ITag[]>) => {
  const localTags = tags;
  const index = localTags.findIndex((t) => t.id === id);
  if (index === -1) {
    logger.warn(`tag with id ${id} not found.`);
    callback(localTags);
    return;
  }
  localTags.splice(index, 1);

  chrome.storage.local.set({ [TAG_KEY]: localTags }, () => {
    logger.info(`delete tag index: ${index}`);
    callback(localTags);
  });
};

// DELETE
const deleteAllTags = (callback: Callback<null>) => {
  chrome.storage.local.remove(TAG_KEY, () => {
    logger.info("deleting all tags");
    callback(null);
  });
};

// set DEFAULT_TAGS_INITIALIZED_KEY
const setDefaultTagsInitialized = (callback: Callback<null>) => {
  chrome.storage.local.set({ [DEFAULT_TAGS_INITIALIZED_KEY]: true }, () => {
    logger.info("initialized default tags");
    callback(null);
  });
};

// get DEFAULT_TAGS_INITIALIZED_KEY
const getDefaultTagsInitialized = (callback: Callback<boolean>) => {
  chrome.storage.local.get(DEFAULT_TAGS_INITIALIZED_KEY, (data) => {
    const value = data?.[DEFAULT_TAGS_INITIALIZED_KEY] ?? false;
    callback(value);
  });
};

export {
  getTagById,
  getTags,
  setTag,
  setTags,
  updateTagById,
  deleteTagById,
  deleteAllTags,
  setDefaultTagsInitialized,
  getDefaultTagsInitialized,
};
