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
  OBJECT_STORE_SERIES_MAPPINGS,
  OBJECT_STORE_ANILIST_CACHE,
  OBJECT_STORE_SYNC_META,
} from "./schema";
const ANILIST_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
import { setApplicationEnabled } from "@/api/applicationStorage";
import { logger } from "@kitamersion/kita-logging";
import { IAutoTag } from "@/types/autotag";
import { ISeriesMapping } from "@/types/integrations/seriesMapping";

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
        const oldVersion = (event as any).oldVersion;
        const newVersion = (event as any).newVersion;

        // Handle version 8 migration - remove cache_media_metadata store
        if (oldVersion < 8 && newVersion >= 8) {
          if (db.objectStoreNames.contains("cache_media_metadata")) {
            logger.info("Removing cache_media_metadata store - replaced by series_mappings");

            db.deleteObjectStore("cache_media_metadata");
          }
        }

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
        reject(new Error(`Database error: ${event}`));
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
        const result = request.result as IVideo | undefined;
        resolve(result?.deleted_at ? undefined : result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get all videos
  getAllVideos(includeDeleted: boolean = false): Promise<IVideo[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readonly");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);

      const request = videoStore.getAll();

      request.onsuccess = () => {
        const rows = request.result as IVideo[];
        resolve(includeDeleted ? rows : rows.filter((row) => !row.deleted_at));
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

      // updated_at is stamped here, in the DB layer, rather than trusted from callers: the sync push
      // filter is `row.updated_at > cursor`, and `undefined > n` is false, so an unstamped row would
      // silently never sync.
      const request = videoStore.put({ ...video, updated_at: Date.now() });
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

      const request = videoStore.put({ ...video, updated_at: Date.now() });
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // soft-delete video by id (tombstoned for sync; excluded from reads)
  deleteVideoById(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readwrite");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);
      const getRequest = videoStore.get(id);

      getRequest.onsuccess = () => {
        const video = getRequest.result as IVideo | undefined;
        if (!video) {
          resolve();
          return;
        }
        // unique_code is cleared on tombstone: it's a `unique: true` index, and a tombstoned row
        // keeping its value would make IndexedDB throw ConstraintError when the user later
        // re-creates the same video. A keyPath evaluating to undefined omits the record from the
        // index entirely, freeing the slot without a schema change. Safe for sync: natural-key
        // reconciliation only matters for a row's first-ever contact between two devices, before
        // either has a stable shared id — a row being deleted has one already and merges by id.
        const putRequest = videoStore.put({ ...video, unique_code: undefined, deleted_at: Date.now(), updated_at: Date.now() });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // soft-delete all videos (bulk/local-only convenience; infrequent, not a hot path)
  deleteAllVideos(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readwrite");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);
      const request = videoStore.openCursor();

      request.onsuccess = () => {
        const cursor = (request as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const video = cursor.value as IVideo;
          if (!video.deleted_at) {
            // unique_code cleared for the same reason as in deleteVideoById.
            cursor.update({ ...video, unique_code: undefined, deleted_at: Date.now(), updated_at: Date.now() });
          }
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

  // get video by unique code
  getVideoByUniqueCode(unique_code: string): Promise<IVideo | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readonly");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);
      const index = videoStore.index("unique_code");
      // Cursor rather than index.get(): get() returns an arbitrary match by primary-key order, so a
      // tombstone sorting ahead of a live row would shadow it and make the live row unreachable.
      const request = index.openCursor(IDBKeyRange.only(unique_code));

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(undefined);
          return;
        }
        const result = cursor.value as IVideo;
        if (!result.deleted_at) {
          resolve(result);
          return;
        }
        cursor.continue();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get videos by pagination (excludes soft-deleted rows from both results and the total/page count)
  getVideosByPagination(page: number, pageSize: number): Promise<IPaginatedVideos> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_VIDEOS, "readonly");
      const videoStore = transaction.objectStore(OBJECT_STORE_VIDEOS);
      const createdAtIndex = videoStore.index("created_at");
      // deleted_at isn't indexed, so a store-wide count() can't distinguish soft-deleted rows.
      // Walk the whole index once, skipping soft-deleted rows for both the page slice and the total count.
      const cursorRequest = createdAtIndex.openCursor(null, "prev"); // iterate in desc order
      const results: IVideo[] = [];
      let totalRecords = 0;

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
          const video = cursor.value as IVideo;
          if (!video.deleted_at) {
            if (totalRecords >= page * pageSize && totalRecords < (page + 1) * pageSize) {
              results.push(video);
            }
            totalRecords++;
          }
          cursor.continue();
        } else {
          resolve({
            page,
            pageSize,
            results,
            totalPages: Math.ceil(totalRecords / pageSize),
          });
        }
      };

      cursorRequest.onerror = () => {
        reject(cursorRequest.error);
      };
    });
  }

  // ================================================================================
  // ======================     TAG STORE           =================================
  // ================================================================================

  // get all tags
  getAllTags(includeDeleted: boolean = false): Promise<ITag[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_TAGS, "readonly");
      const tagStore = transaction.objectStore(OBJECT_STORE_TAGS);
      const request = tagStore.getAll();
      request.onsuccess = () => {
        const rows = request.result as ITag[];
        resolve(includeDeleted ? rows : rows.filter((row) => !row.deleted_at));
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
        const result = request.result as ITag | undefined;
        resolve(result?.deleted_at ? undefined : result);
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
      // Cursor rather than index.get() — see getVideoByUniqueCode for why.
      const request = index.openCursor(IDBKeyRange.only(code));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(undefined);
          return;
        }
        const result = cursor.value as ITag;
        if (!result.deleted_at) {
          resolve(result);
          return;
        }
        cursor.continue();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // add tag
  addTag({ id, name, code, created_at, owner, color }: ITag): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_TAGS, "readwrite");
      const tagStore = transaction.objectStore(OBJECT_STORE_TAGS);

      const codeOrFromName = code ?? name.toUpperCase().replace(/ /g, "_"); // example: "Hello World" -> "HELLO_WORLD"

      const tagItem: ITag = {
        id: id ?? self.crypto.randomUUID(),
        name,
        code: codeOrFromName,
        created_at: created_at ?? Date.now(),
        // Always a fresh stamp (not `??`-defaulted): every write is by definition a new update to
        // this row's state, and the sync push filter (`updated_at > cursor`) skips unstamped rows.
        updated_at: Date.now(),
        owner: owner ?? "USER",
        color,
      };
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
      const request = tagStore.put({ ...tag, updated_at: Date.now() });
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // soft-delete tag by id (tombstoned for sync; excluded from reads)
  deleteTagById(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;

      const transaction = this.db.transaction(OBJECT_STORE_TAGS, "readwrite");
      const tagStore = transaction.objectStore(OBJECT_STORE_TAGS);
      const getRequest = tagStore.get(id);

      getRequest.onsuccess = () => {
        const tag = getRequest.result as ITag | undefined;
        if (!tag) {
          resolve();
          return;
        }
        // code is cleared on tombstone — see the equivalent comment in deleteVideoById. `tags.code`
        // is a `unique: true` index, so a tombstone that kept its code would block re-creating a
        // tag with the same name with a ConstraintError.
        const putRequest = tagStore.put({ ...tag, code: undefined, deleted_at: Date.now(), updated_at: Date.now() });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
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
      const request = videoTagStore.put({ ...videoTag, updated_at: Date.now() });
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get all video tag relationships
  getAllVideoTags(includeDeleted: boolean = false): Promise<IVideoTag[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_VIDEO_TAGS, "readonly");
      const videoTagStore = transaction.objectStore(OBJECT_STORE_VIDEO_TAGS);
      const request = videoTagStore.getAll();
      request.onsuccess = () => {
        const rows = request.result as IVideoTag[];
        resolve(includeDeleted ? rows : rows.filter((row) => !row.deleted_at));
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // soft-delete video tag relationships by video id (tombstoned for sync; excluded from reads)
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
          cursor.update({ ...cursor.value, deleted_at: Date.now(), updated_at: Date.now() });
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

  // soft-delete video tag relationships by tag id (tombstoned for sync; excluded from reads)
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
          cursor.update({ ...cursor.value, deleted_at: Date.now(), updated_at: Date.now() });
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

  // soft-delete all video tag relationships (tombstoned for sync; excluded from reads)
  deleteAllVideoTags(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_VIDEO_TAGS, "readwrite");
      const videoTagStore = transaction.objectStore(OBJECT_STORE_VIDEO_TAGS);
      const request = videoTagStore.openCursor();
      request.onsuccess = () => {
        const cursor = (request as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const videoTag = cursor.value as IVideoTag;
          if (!videoTag.deleted_at) {
            cursor.update({ ...videoTag, deleted_at: Date.now(), updated_at: Date.now() });
          }
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
      const request = autoTagStore.put({ id: itemId, origin: origin, tags: tags, updated_at: Date.now() });
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
      // Cursor rather than index.get() — see getVideoByUniqueCode. `origin` is a non-unique index
      // and never had a unique constraint to protect it, so tombstone shadowing is a live risk here:
      // the caller treats a falsy result as "auto-tagging disabled for this origin".
      const request = index.openCursor(IDBKeyRange.only(origin));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(undefined);
          return;
        }
        const result = cursor.value as IAutoTag;
        if (!result.deleted_at) {
          resolve(result);
          return;
        }
        cursor.continue();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // get all auto tag
  getAllAutoTags(includeDeleted: boolean = false): Promise<IAutoTag[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_AUTO_TAG, "readonly");
      const autoTagStore = transaction.objectStore(OBJECT_STORE_AUTO_TAG);
      const request = autoTagStore.getAll();
      request.onsuccess = () => {
        const rows = request.result as IAutoTag[];
        resolve(includeDeleted ? rows : rows.filter((row) => !row.deleted_at));
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // soft-delete auto tag by id (tombstoned for sync; excluded from reads)
  deleteAutoTagById(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_AUTO_TAG, "readwrite");
      const autoTagStore = transaction.objectStore(OBJECT_STORE_AUTO_TAG);
      const getRequest = autoTagStore.get(id);

      getRequest.onsuccess = () => {
        const autoTag = getRequest.result as IAutoTag | undefined;
        if (!autoTag) {
          resolve();
          return;
        }
        const putRequest = autoTagStore.put({ ...autoTag, deleted_at: Date.now(), updated_at: Date.now() });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ================================================================================
  // ======================     SERIES MAPPINGS STORE         ======================
  // ================================================================================

  // Get all series mappings
  getAllSeriesMappings(): Promise<ISeriesMapping[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([OBJECT_STORE_SERIES_MAPPINGS], "readonly");
      const store = transaction.objectStore(OBJECT_STORE_SERIES_MAPPINGS);
      const request = store.getAll();

      request.onsuccess = () => {
        const mappings: ISeriesMapping[] = request.result || [];
        // Filter out expired mappings
        const now = Date.now();
        const validMappings = mappings.filter((mapping) => mapping.expires_at > now);
        resolve(validMappings);
      };

      request.onerror = () => {
        logger.error("Error getting all series mappings from IndexedDB");

        reject(request.error);
      };
    });
  }

  // Get series mapping by ID
  getSeriesMappingById(id: string): Promise<ISeriesMapping | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(undefined);
        return;
      }

      const transaction = this.db.transaction([OBJECT_STORE_SERIES_MAPPINGS], "readonly");
      const store = transaction.objectStore(OBJECT_STORE_SERIES_MAPPINGS);
      const request = store.get(id);

      request.onsuccess = () => {
        const mapping: ISeriesMapping | undefined = request.result;
        if (mapping && mapping.expires_at > Date.now()) {
          resolve(mapping);
        } else {
          resolve(undefined);
        }
      };

      request.onerror = () => {
        logger.error(`Error getting series mapping ${id} from IndexedDB`);
        reject(request.error);
      };
    });
  }

  // Find series mapping by normalized title and platform
  findSeriesMappingByTitle(normalizedTitle: string, sourcePlatform: string, seasonYear?: number): Promise<ISeriesMapping | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(undefined);
        return;
      }

      const transaction = this.db.transaction([OBJECT_STORE_SERIES_MAPPINGS], "readonly");
      const store = transaction.objectStore(OBJECT_STORE_SERIES_MAPPINGS);
      const index = store.index("normalized_title");
      const request = index.openCursor(IDBKeyRange.only(normalizedTitle));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const mapping: ISeriesMapping = cursor.value;

          // Check if expired
          if (mapping.expires_at <= Date.now()) {
            cursor.continue();
            return;
          }

          // Check platform match
          if (mapping.source_platform !== sourcePlatform) {
            cursor.continue();
            return;
          }

          // Check season year if provided
          if (seasonYear && mapping.season_year && mapping.season_year !== seasonYear) {
            cursor.continue();
            return;
          }

          resolve(mapping);
        } else {
          resolve(undefined);
        }
      };

      request.onerror = () => {
        logger.error("Error finding series mapping by title from IndexedDB");
        reject(request.error);
      };
    });
  }

  // Add series mapping
  addSeriesMapping(mapping: ISeriesMapping): Promise<ISeriesMapping> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction([OBJECT_STORE_SERIES_MAPPINGS], "readwrite");
      const store = transaction.objectStore(OBJECT_STORE_SERIES_MAPPINGS);
      const request = store.add(mapping);

      request.onsuccess = () => {
        logger.info(`Added series mapping: ${mapping.series_title} -> AniList ID: ${mapping.anilist_series_id}`);
        resolve(mapping);
      };

      request.onerror = () => {
        logger.error("Error adding series mapping to IndexedDB");
        reject(request.error);
      };
    });
  }

  // Update series mapping
  updateSeriesMapping(mapping: ISeriesMapping): Promise<ISeriesMapping> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction([OBJECT_STORE_SERIES_MAPPINGS], "readwrite");
      const store = transaction.objectStore(OBJECT_STORE_SERIES_MAPPINGS);
      const request = store.put(mapping);

      request.onsuccess = () => {
        logger.info(`Updated series mapping: ${mapping.series_title}`);
        resolve(mapping);
      };

      request.onerror = () => {
        logger.error("Error updating series mapping in IndexedDB");
        reject(request.error);
      };
    });
  }

  // Delete series mapping
  deleteSeriesMapping(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction([OBJECT_STORE_SERIES_MAPPINGS], "readwrite");
      const store = transaction.objectStore(OBJECT_STORE_SERIES_MAPPINGS);
      const request = store.delete(id);

      request.onsuccess = () => {
        logger.info(`Deleted series mapping: ${id}`);
        resolve(true);
      };

      request.onerror = () => {
        logger.error(`Error deleting series mapping ${id} from IndexedDB`);
        reject(request.error);
      };
    });
  }

  // Get mappings by platform
  getSeriesMappingsByPlatform(sourcePlatform: string): Promise<ISeriesMapping[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([OBJECT_STORE_SERIES_MAPPINGS], "readonly");
      const store = transaction.objectStore(OBJECT_STORE_SERIES_MAPPINGS);
      const index = store.index("source_platform");
      const request = index.getAll(sourcePlatform);

      request.onsuccess = () => {
        const mappings: ISeriesMapping[] = request.result || [];
        // Filter out expired mappings
        const now = Date.now();
        const validMappings = mappings.filter((mapping) => mapping.expires_at > now);
        resolve(validMappings);
      };

      request.onerror = () => {
        logger.error(`Error getting series mappings for platform ${sourcePlatform} from IndexedDB`);
        reject(request.error);
      };
    });
  }

  // Clean up expired series mappings
  cleanupExpiredSeriesMappings(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([OBJECT_STORE_SERIES_MAPPINGS], "readwrite");
      const store = transaction.objectStore(OBJECT_STORE_SERIES_MAPPINGS);
      let deleteCount = 0;

      const index = store.index("expires_at");
      const request = index.openCursor(IDBKeyRange.upperBound(Date.now()));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deleteCount++;
          cursor.continue();
        } else {
          logger.info(`Cleaned up ${deleteCount} expired series mappings`);
          resolve();
        }
      };

      request.onerror = () => {
        logger.error("Error cleaning up expired series mappings from IndexedDB");
        reject(request.error);
      };
    });
  }

  // ====================== AniList Cache =====================
  // key: string (e.g. "profile:<userId>", "list:<userId>:<status>")
  public setAniListCache(key: string, value: any, ttl: number = ANILIST_CACHE_TTL): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_ANILIST_CACHE, "readwrite");
      const store = transaction.objectStore(OBJECT_STORE_ANILIST_CACHE);
      const expires_at = Date.now() + ttl;
      const request = store.put({ key, value, expires_at });
      request.onsuccess = () => resolve();
      request.onerror = () => {
        logger.error(`setAniListCache error: ${request.error}`);
        reject(request.error);
      };
    });
  }

  public getAniListCache(key: string): Promise<any | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return;
      const transaction = this.db.transaction(OBJECT_STORE_ANILIST_CACHE, "readonly");
      const store = transaction.objectStore(OBJECT_STORE_ANILIST_CACHE);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expires_at > Date.now()) {
          resolve(result.value);
        } else {
          resolve(undefined);
        }
      };
      request.onerror = () => {
        logger.error(`getAniListCache error: ${request.error}`);
        reject(request.error);
      };
    });
  }

  // Get raw cache object for UI (value + expires_at)
  public async getAniListCacheRaw(key: string): Promise<{ value: any; expires_at: number } | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null);
      const transaction = this.db.transaction(OBJECT_STORE_ANILIST_CACHE, "readonly");
      const store = transaction.objectStore(OBJECT_STORE_ANILIST_CACHE);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expires_at > Date.now()) {
          resolve({ value: result.value, expires_at: result.expires_at });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => {
        logger.error(`getAniListCacheRaw error: ${request.error}`);
        reject(request.error);
      };
    });
  }

  // ====================== Sync cursor =====================
  public getLastSyncedAt(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(0);
      const transaction = this.db.transaction(OBJECT_STORE_SYNC_META, "readonly");
      const store = transaction.objectStore(OBJECT_STORE_SYNC_META);
      const request = store.get("last_synced_at");
      request.onsuccess = () => resolve(request.result?.value ?? 0);
      request.onerror = () => reject(request.error);
    });
  }

  public setLastSyncedAt(value: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error("Database not initialized"));
      const transaction = this.db.transaction(OBJECT_STORE_SYNC_META, "readwrite");
      const store = transaction.objectStore(OBJECT_STORE_SYNC_META);
      const request = store.put({ key: "last_synced_at", value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ====================== Sync write-back =====================
  private replaceAllInStore<T>(storeName: string, rows: T[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error("Database not initialized"));
      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      store.clear();
      for (const row of rows) store.put(row);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  public replaceAllTags(rows: ITag[]): Promise<void> {
    return this.replaceAllInStore(OBJECT_STORE_TAGS, rows);
  }
  public replaceAllVideos(rows: IVideo[]): Promise<void> {
    return this.replaceAllInStore(OBJECT_STORE_VIDEOS, rows);
  }
  public replaceAllVideoTags(rows: IVideoTag[]): Promise<void> {
    return this.replaceAllInStore(OBJECT_STORE_VIDEO_TAGS, rows);
  }
  public replaceAllAutoTags(rows: IAutoTag[]): Promise<void> {
    return this.replaceAllInStore(OBJECT_STORE_AUTO_TAG, rows);
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
}

const db = IndexedDB.getInstance();
(async () => {
  await db.openDatabase();
})();

export default db;
