import { DEFAULT_TAGS } from "@/data/contants";
import { IVideoTag } from "@/types/relationship";
import { ITag } from "@/types/tag";
import { IVideo } from "@/types/video";
import { v4 as uuidv4 } from "uuid";

const DB_NAME = "kitamersiondb";
const OBJECT_STORE_VIDEOS = "videos";
const OBJECT_STORE_TAGS = "tags";
const OBJECT_STORE_VIDEO_TAGS = "video_tags";

class IndexedDB {
  private static instance: IndexedDB;
  private db: IDBDatabase | null = null;

  private constructor() {
    this.openDatabase();
    this.requestPersistentStorage();
  }

  static getInstance(): IndexedDB {
    if (!IndexedDB.instance) {
      IndexedDB.instance = new IndexedDB();
    }
    return IndexedDB.instance;
  }

  requestPersistentStorage(): Promise<boolean> {
    return new Promise((resolve) => {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then((granted) => {
          if (granted) {
            console.log("Storage will not be cleared except by explicit user action");
            resolve(true);
          } else {
            console.log("Storage may be cleared by the UA under storage pressure.");
            resolve(false);
          }
        });
      } else {
        console.log("Persistent storage API not supported");
        resolve(false);
      }
    });
  }

  // ================================================================================
  // ======================     INITIALIZE SCHEMA         ===========================
  // ================================================================================
  private openDatabase() {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result;

      // video store
      const videoStore = this.db.createObjectStore(OBJECT_STORE_VIDEOS, { keyPath: "id" });
      videoStore.createIndex("unquie_code", "unquie_code", { unique: true });

      // tag store
      const tagStore = this.db.createObjectStore(OBJECT_STORE_TAGS, { keyPath: "id" });
      tagStore.createIndex("code", "code", { unique: true });

      // video and tag aggregate store
      const videoTagStore = this.db.createObjectStore(OBJECT_STORE_VIDEO_TAGS, { keyPath: "id" });
      videoTagStore.createIndex("video_id", "video_id", { unique: false });
      videoTagStore.createIndex("tag_id", "tag_id", { unique: false });
    };

    request.onsuccess = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
    };

    request.onerror = (event) => {
      console.log("Error opening DB", event);
    };
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
  getVideoByUniqueCode(unquie_code: string): Promise<IVideo | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readonly");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);
      const index = videoStore.index("unquie_code");
      const request = index.get(unquie_code);

      request.onsuccess = () => {
        resolve(request.result);
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

      const tagItem: ITag = { id: id ?? uuidv4(), name, code: codeOrFromName, created_at: created_at ?? Date.now() };
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
}

const db = IndexedDB.getInstance();
db.requestPersistentStorage().then((granted) => {
  if (granted) {
    console.log("Persistent storage granted");
  } else {
    console.log("Persistent storage not granted");
  }
});

export default db;
