type IndexSchema = {
  name: string;
  options?: IDBIndexParameters;
};

type StoreSchema = {
  name: string;
  options?: IDBObjectStoreParameters;
  indexes?: IndexSchema[];
};

type DBSchema = {
  version: number;
  stores: StoreSchema[];
};

export const DB_NAME = "kitamersiondb";
export const DB_VERSION = 9; // bump version for new store
export const OBJECT_STORE_ANILIST_CACHE = "anilist_cache";
export const OBJECT_STORE_VIDEOS = "videos";
export const OBJECT_STORE_TAGS = "tags";
export const OBJECT_STORE_VIDEO_TAGS = "video_tags";
export const OBJECT_STORE_AUTO_TAG = "auto_tags";
export const OBJECT_STORE_SERIES_MAPPINGS = "series_mappings";

export const DB_SCHEMAS: DBSchema[] = [
  {
    version: 1,
    stores: [
      {
        name: OBJECT_STORE_VIDEOS,
        options: { keyPath: "id" },
      },
      {
        name: OBJECT_STORE_TAGS,
        options: { keyPath: "id" },
        indexes: [
          {
            name: "code",
            options: { unique: true },
          },
        ],
      },
      {
        name: OBJECT_STORE_VIDEO_TAGS,
        options: { keyPath: "id" },
        indexes: [
          {
            name: "video_id",
            options: { unique: false },
          },
          {
            name: "tag_id",
            options: { unique: false },
          },
        ],
      },
    ],
  },
  {
    version: 2,
    stores: [
      {
        name: OBJECT_STORE_VIDEOS,
        indexes: [
          {
            name: "unique_code",
            options: { unique: true },
          },
        ],
      },
      {
        name: OBJECT_STORE_AUTO_TAG,
        options: { keyPath: "id" },
        indexes: [
          {
            name: "origin",
            options: { unique: false },
          },
          {
            name: "tag_id",
            options: { unique: false },
          },
        ],
      },
    ],
  },
  {
    version: 3,
    stores: [
      {
        name: OBJECT_STORE_VIDEOS,
        indexes: [
          {
            name: "created_at",
            options: { unique: false },
          },
        ],
      },
    ],
  },
  {
    version: 4,
    stores: [
      {
        name: "cache_media_metadata",
        options: { keyPath: "unique_code" },
        indexes: [
          {
            name: "id",
            options: { unique: false },
          },
          {
            name: "unique_code",
            options: { unique: true },
          },
          {
            name: "expires_at",
            options: { unique: false },
          },
        ],
      },
    ],
  },
  {
    version: 7,
    stores: [
      {
        name: OBJECT_STORE_SERIES_MAPPINGS,
        options: { keyPath: "id" },
        indexes: [
          {
            name: "normalized_title",
            options: { unique: false },
          },
          {
            name: "source_platform",
            options: { unique: false },
          },
          {
            name: "anilist_series_id",
            options: { unique: false },
          },
          {
            name: "season_year",
            options: { unique: false },
          },
          {
            name: "expires_at",
            options: { unique: false },
          },
          {
            name: "created_at",
            options: { unique: false },
          },
        ],
      },
    ],
  },
  {
    version: 8,
    // Migration to remove cache_media_metadata store - it's replaced by series_mappings
    stores: [],
  },
  {
    version: 9,
    stores: [
      {
        name: OBJECT_STORE_ANILIST_CACHE,
        options: { keyPath: "key" },
        indexes: [
          {
            name: "expires_at",
            options: { unique: false },
          },
        ],
      },
    ],
  },
];
