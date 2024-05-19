/* eslint-disable no-fallthrough */
import { DEFAULT_TAGS } from "@/data/contants";
import { IVideoTag } from "@/types/relationship";
import { ITag } from "@/types/tag";
import { IPaginatedVideos, IVideo } from "@/types/video";
import {
  DB_NAME,
  DB_VERSION,
  DB_SCHEMAS,
  OBJECT_STORE_VIDEOS,
  OBJECT_STORE_TAGS,
  OBJECT_STORE_VIDEO_TAGS,
  OBJECT_STORE_AUTO_TAG,
} from "./schema";
import { setApplicationEnabled } from "@/api/applicationStorage";
import logger from "@/config/logger";
import { IAutoTag } from "@/types/autotag";

class IndexedDB {
  private static instance: IndexedDB;
  private db: IDBDatabase | null = null;

  private constructor() {}

  static getInstance(): IndexedDB {
    if (!IndexedDB.instance) {
      IndexedDB.instance = new IndexedDB();
    }
    return IndexedDB.instance;
  }

  public requestPersistentStorage(): Promise<boolean> {
    return new Promise((resolve) => {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then((granted) => {
          if (granted) {
            logger.info("Storage will not be cleared except by explicit user action");
            resolve(true);
          } else {
            logger.info("Storage may be cleared by the UA under storage pressure.");
            resolve(false);
          }
        });
      } else {
        logger.info("Persistent storage API not supported");
        resolve(false);
      }
    });
  }

  // ================================================================================
  // ======================     INITIALIZE SCHEMA         ===========================
  // ================================================================================
  public openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      logger.info("connecting database...");
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        setApplicationEnabled(false, () => {});
        logger.warn("database upgrade needed...");
        this.db = (event.target as IDBOpenDBRequest).result;
        const db = this.db;
        const transaction = (event.target as IDBOpenDBRequest).transaction;

        for (const schema of DB_SCHEMAS) {
          for (const storeSchema of schema.stores) {
            let store: IDBObjectStore | null = null;
            if (!db.objectStoreNames.contains(storeSchema.name)) {
              logger.debug(`creating object store: ${storeSchema.name}`);
              store = db.createObjectStore(storeSchema.name, storeSchema.options);
            } else {
              // get the existing object store
              logger.debug(`getting existing object store: ${storeSchema.name}`);
              store = transaction?.objectStore(storeSchema.name) ?? null;
            }

            if (store && storeSchema.indexes) {
              for (const indexSchema of storeSchema.indexes) {
                if (!store.indexNames.contains(indexSchema.name)) {
                  logger.debug(`creating index: ${indexSchema.name}`);
                  store.createIndex(indexSchema.name, indexSchema.name, indexSchema.options);
                }
              }
            }
          }
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        logger.info("database connected successfully!");
        setApplicationEnabled(true, () => {});
        resolve(this.db);
      };

      request.onerror = (event) => {
        logger.error(`error opening database: ${event}`);
        setApplicationEnabled(true, () => {});
        reject(event);
      };
    });
  }

  // ================================================================================
  // ======================     INITIALIZE DEFAULT TAGS         =====================
  // ================================================================================

  /*
   * Add missing default tags
   */
  initializeDefaultTags = async (): Promise<number> => {
    const getCurrentTags = await this.getAllTags();

    if (!getCurrentTags) {
      for (const tag of DEFAULT_TAGS) {
        await this.addTag(tag);
      }

      return DEFAULT_TAGS.length;
    }

    // get tags from default that are not in the current tags
    const missingTags = DEFAULT_TAGS.filter((defaultTag) => {
      return !getCurrentTags.find((tag) => tag.code === defaultTag.code);
    });

    if (!missingTags || missingTags.length === 0) {
      return 0;
    }

    // add missing tags by name from default tag
    for (const tag of missingTags) {
      await this.addTag({ name: tag.name });
    }

    return missingTags.length;
  };

  // ================================================================================
  // ======================     VIDEO STORE         =================================
  // ================================================================================

  // get video by id
  getVideoById(id: string): Promise<IVideo | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readonly");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);

      const request = videoStore.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get all videos
  getAllVideos(): Promise<IVideo[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readonly");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);

      const request = videoStore.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // add video
  addVideo(video: IVideo): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readwrite");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);

      const request = videoStore.put(video);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // update video by id
  updateVideoById(video: IVideo): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readwrite");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);

      const request = videoStore.put(video);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // delete video by id
  deleteVideoById(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readwrite");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);

      videoStore.delete(id);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  // delete all videos
  deleteAllVideos(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readwrite");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);

      const request = videoStore.clear();
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get video by unique code
  getVideoByUniqueCode(unique_code: string): Promise<IVideo | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readonly");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);
      const index = videoStore.index("unique_code");
      const request = index.get(unique_code);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get videos by pagination
  getVideosByPagination(page: number, pageSize: number): Promise<IPaginatedVideos> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readonly");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);
      const createdAtIndex = videoStore.index("created_at");
      const request = videoStore.count();

      request.onsuccess = () => {
        const totalRecords = request.result;
        const totalPages = Math.ceil(totalRecords / pageSize);
        const cursorRequest = createdAtIndex.openCursor(null, "prev"); // open cursor to iterate in desc order
        const results: IVideo[] = [];
        let index = 0;

        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (cursor) {
            if (index >= page * pageSize && index < (page + 1) * pageSize) {
              results.push(cursor.value);
            }
            index++;
            if (results.length < pageSize) {
              cursor.continue();
            } else {
              resolve({
                page,
                pageSize,
                results,
                totalPages,
              });
            }
          } else if (results.length > 0) {
            resolve({
              page,
              pageSize,
              results,
              totalPages,
            });
          } else {
            resolve({
              page,
              pageSize,
              results: [],
              totalPages,
            });
          }
        };

        cursorRequest.onerror = () => {
          reject(cursorRequest.error);
        };
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // ================================================================================
  // ======================     TAG STORE           =================================
  // ================================================================================

  // get all tags
  getAllTags(): Promise<ITag[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_TAGS, "readonly");
      const tagStore = transaction.objectStore(OBJECT_STORE_TAGS);
      const request = tagStore.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get tag by id
  getTagById(id: string): Promise<ITag | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_TAGS, "readonly");
      const tagStore = transaction.objectStore(OBJECT_STORE_TAGS);
      const request = tagStore.get(id);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get tag by code
  getTagByCode(code: string): Promise<ITag | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_TAGS, "readonly");
      const tagStore = transaction.objectStore(OBJECT_STORE_TAGS);
      const index = tagStore.index("code");
      const request = index.get(code);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // add tag
  addTag({ id, name, code, created_at }: ITag): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_TAGS, "readwrite");
      const tagStore = transaction.objectStore(OBJECT_STORE_TAGS);

      const codeOrFromName = code ?? name.toUpperCase().replace(/ /g, "_"); // example: "Hello World" -> "HELLO_WORLD"

      const tagItem: ITag = { id: id ?? self.crypto.randomUUID(), name, code: codeOrFromName, created_at: created_at ?? Date.now() };
      const request = tagStore.put(tagItem);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // update tag by id
  updateTagById(tag: ITag): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_TAGS, "readwrite");
      const tagStore = transaction.objectStore(OBJECT_STORE_TAGS);
      const request = tagStore.put(tag);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // delete tag by id
  deleteTagById(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_TAGS, "readwrite");
      const tagStore = transaction.objectStore(OBJECT_STORE_TAGS);

      tagStore.delete(id);

      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  // ================================================================================
  // ======================     VIDEO TAG AGGREGATOR STORE         ==================
  // ================================================================================

  // add a video tag relationship
  addVideoTag(videoTag: IVideoTag): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_VIDEO_TAGS, "readwrite");
      const videoTagStore = transaction.objectStore(OBJECT_STORE_VIDEO_TAGS);
      const request = videoTagStore.put(videoTag);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get all video tag relationships
  getAllVideoTags(): Promise<IVideoTag[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_VIDEO_TAGS, "readonly");
      const videoTagStore = transaction.objectStore(OBJECT_STORE_VIDEO_TAGS);
      const request = videoTagStore.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // delete video tag relationship by video id
  deleteVideoTagByVideoId(videoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_VIDEO_TAGS, "readwrite");
      const videoTagStore = transaction.objectStore(OBJECT_STORE_VIDEO_TAGS);
      const index = videoTagStore.index("video_id");
      const request = index.openCursor(IDBKeyRange.only(videoId));
      request.onsuccess = () => {
        const cursor = (request as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // delete video tag relationship by tag id
  deleteVideoTagByTagId(tagId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_VIDEO_TAGS, "readwrite");
      const videoTagStore = transaction.objectStore(OBJECT_STORE_VIDEO_TAGS);
      const index = videoTagStore.index("tag_id");
      const request = index.openCursor(IDBKeyRange.only(tagId));
      request.onsuccess = () => {
        const cursor = (request as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // delete all video tag relationships
  deleteAllVideoTags(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_VIDEO_TAGS, "readwrite");
      const videoTagStore = transaction.objectStore(OBJECT_STORE_VIDEO_TAGS);
      const request = videoTagStore.clear();
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // ================================================================================
  // =======================     AUTO ASSIGN TAGS         ===========================
  // ================================================================================

  // add auto tag
  addAutoTag({ id, origin, tags }: IAutoTag): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_AUTO_TAG, "readwrite");
      const autoTagStore = transaction.objectStore(OBJECT_STORE_AUTO_TAG);

      const itemId = id ?? window.crypto.randomUUID();
      const request = autoTagStore.put({ id: itemId, origin: origin, tags: tags });
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get auto tag by origin
  getAutoTagByOrigin(origin: string): Promise<IAutoTag | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_AUTO_TAG, "readonly");
      const autoTagStore = transaction.objectStore(OBJECT_STORE_AUTO_TAG);
      const index = autoTagStore.index("origin");
      const request = index.get(origin);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get all auto tag
  getAllAutoTags(): Promise<IAutoTag[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_AUTO_TAG, "readonly");
      const autoTagStore = transaction.objectStore(OBJECT_STORE_AUTO_TAG);
      const request = autoTagStore.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // delete auto tag by id
  deleteAutoTagById(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_AUTO_TAG, "readwrite");
      const autoTagStore = transaction.objectStore(OBJECT_STORE_AUTO_TAG);
      autoTagStore.delete(id);
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }
}

const db = IndexedDB.getInstance();
(async () => {
  await db.openDatabase();
})();

export default db;
