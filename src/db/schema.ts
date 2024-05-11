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
export const DB_VERSION = 3;
export const OBJECT_STORE_VIDEOS = "videos";
export const OBJECT_STORE_TAGS = "tags";
export const OBJECT_STORE_VIDEO_TAGS = "video_tags";
export const OBJECT_STORE_AUTO_TAG = "auto_tags";

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
];
