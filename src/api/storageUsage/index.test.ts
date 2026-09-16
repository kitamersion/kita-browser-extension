import { getStorageUsageSummary } from "./index";
import db from "@/db";
import {
  OBJECT_STORE_ANILIST_CACHE,
  OBJECT_STORE_AUTO_TAG,
  OBJECT_STORE_SERIES_MAPPINGS,
  OBJECT_STORE_SYNC_META,
  OBJECT_STORE_TAGS,
  OBJECT_STORE_VIDEOS,
  OBJECT_STORE_VIDEO_TAGS,
} from "@/db/schema";

jest.mock("@/db", () => ({
  __esModule: true,
  default: {
    getObjectStoreByteSize: jest.fn(),
  },
}));

const mockGetObjectStoreByteSize = db.getObjectStoreByteSize as jest.Mock;

function stubChromeBytesInUse(totalLocalBytes: number, perBucketLocalBytes: number) {
  const getBytesInUse = jest.fn((keys: string[] | null, callback: (bytes: number) => void) => {
    if (keys === null) {
      callback(totalLocalBytes);
    } else {
      callback(perBucketLocalBytes);
    }
  });
  (global as any).chrome = { storage: { local: { getBytesInUse } } };
}

describe("getStorageUsageSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetObjectStoreByteSize.mockImplementation((storeName: string) => {
      const sizes: Record<string, number> = {
        [OBJECT_STORE_VIDEOS]: 100,
        [OBJECT_STORE_TAGS]: 50,
        [OBJECT_STORE_VIDEO_TAGS]: 10,
        [OBJECT_STORE_AUTO_TAG]: 5,
        [OBJECT_STORE_SERIES_MAPPINGS]: 200,
        [OBJECT_STORE_ANILIST_CACHE]: 300,
        [OBJECT_STORE_SYNC_META]: 20,
      };
      return Promise.resolve(sizes[storeName] ?? 0);
    });
  });

  test("combines IndexedDB store sizes and chrome.storage.local bucket sizes into named buckets, with the remainder as Other", async () => {
    stubChromeBytesInUse(1000, 7);

    const summary = await getStorageUsageSummary();
    const findBucket = (name: string) => summary.buckets.find((bucket) => bucket.name === name);

    expect(findBucket("Videos & Tags")?.bytes).toBe(100 + 50 + 10 + 5 + 7);
    expect(findBucket("AniList Cache")?.bytes).toBe(300);
    expect(findBucket("AniList Integration")?.bytes).toBe(7);
    expect(findBucket("Series Mappings")?.bytes).toBe(200);
    expect(findBucket("Sync")?.bytes).toBe(20 + 7);
    expect(findBucket("General Settings")?.bytes).toBe(7);
    expect(findBucket("Other")?.bytes).toBe(1000 - 7 * 4);

    expect(summary.totalBytes).toBe(100 + 50 + 10 + 5 + 200 + 300 + 20 + 1000);
    expect(summary.buckets.reduce((sum, bucket) => sum + bucket.bytes, 0)).toBe(summary.totalBytes);
  });

  test("omits the Other bucket when there is no unbucketed local storage remainder", async () => {
    stubChromeBytesInUse(7 * 4, 7);

    const summary = await getStorageUsageSummary();

    expect(summary.buckets.find((bucket) => bucket.name === "Other")).toBeUndefined();
  });
});
