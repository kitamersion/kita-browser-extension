import { KitaSchema } from "@/types/kitaschema";
import { SiteKey } from "@/types/video";
import { ITag } from "@/types/tag";
import { SETTINGS, settingsManager } from "@/api/settings";
import IndexedDB from "@/db/index";
import { importFromJSON } from "./index";

jest.mock("@/db/index", () => ({
  __esModule: true,
  default: {
    addVideo: jest.fn().mockResolvedValue(undefined),
    addTag: jest.fn().mockResolvedValue(undefined),
    addVideoTag: jest.fn().mockResolvedValue(undefined),
    addAutoTag: jest.fn().mockResolvedValue(undefined),
    getVideoByUniqueCode: jest.fn().mockResolvedValue(undefined),
    deleteVideoById: jest.fn().mockResolvedValue(undefined),
    getTagByCode: jest.fn().mockResolvedValue(undefined),
    deleteTagById: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockAddTag = IndexedDB.addTag as jest.Mock;
const mockAddVideo = IndexedDB.addVideo as jest.Mock;
const mockGetVideoByUniqueCode = IndexedDB.getVideoByUniqueCode as jest.Mock;
const mockDeleteVideoById = IndexedDB.deleteVideoById as jest.Mock;
const mockGetTagByCode = IndexedDB.getTagByCode as jest.Mock;
const mockDeleteTagById = IndexedDB.deleteTagById as jest.Mock;

const createChromeStorageStub = () => {
  const store: Record<string, any> = {};
  return {
    storage: {
      local: {
        get: (keys: string | string[], callback: (data: Record<string, any>) => void) => {
          if (Array.isArray(keys)) {
            const result: Record<string, any> = {};
            keys.forEach((key) => {
              result[key] = store[key];
            });
            callback(result);
          } else {
            callback({ [keys]: store[keys] });
          }
        },
        set: (data: Record<string, any>, callback: () => void) => {
          Object.assign(store, data);
          callback();
        },
      },
    },
    runtime: {
      lastError: undefined,
    },
  };
};

beforeEach(() => {
  (global as any).chrome = createChromeStorageStub();
  mockAddTag.mockClear();
  mockAddVideo.mockClear();
  mockGetVideoByUniqueCode.mockClear().mockResolvedValue(undefined);
  mockDeleteVideoById.mockClear();
  mockGetTagByCode.mockClear().mockResolvedValue(undefined);
  mockDeleteTagById.mockClear();
});

const buildFile = (data: unknown): File => ({ text: async () => JSON.stringify(data) }) as unknown as File;

const basePayload: KitaSchema = {
  UserItems: {
    Videos: [],
    Tags: [],
    VideoTagRelationships: [],
    AutoTags: [],
    SeriesMappings: [],
    AnilistPendingSync: [],
  },
  ApplicationSettings: {
    IsReady: false,
    IsApplicationEnabled: true,
    IsContentScriptEnabled: true,
    AnilistSyncMedia: true,
    Theme: "dark",
    SourceAutoTrack: {
      Crunchyroll: { AutoTrack: { enabled: true, watchPercentage: 85 }, AutoSync: { enabled: true } },
      Youtube: { AutoTrack: { enabled: true, watchPercentage: 75 }, AutoSync: { enabled: false } },
    },
    StorageKeys: {} as KitaSchema["ApplicationSettings"]["StorageKeys"],
  },
  Statistics: { VideoStatistics: { TotalVideos: 0, TotalDurationSeconds: 0 }, TagStatistics: { TotalTags: 0 } },
};

describe("importFromJSON", () => {
  test("preserves tag code, owner, and color instead of truncating them", async () => {
    const payload: KitaSchema = {
      ...basePayload,
      UserItems: {
        ...basePayload.UserItems,
        Tags: [
          {
            id: "tag-1",
            name: "Isekai",
            code: "ISEKAI_CUSTOM",
            owner: "INTEGRATION_ANILIST",
            color: "#FF6347",
            created_at: 1700000000000,
          },
        ],
      },
    };

    await importFromJSON(buildFile(payload));

    expect(mockAddTag).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "tag-1",
        name: "Isekai",
        code: "ISEKAI_CUSTOM",
        owner: "INTEGRATION_ANILIST",
        color: "#FF6347",
      })
    );
  });

  test("tombstones a conflicting local tag before importing one that shares its code under a different id", async () => {
    mockGetTagByCode.mockResolvedValue({ id: "local-test-tag", code: "SHARED_CODE" });
    const payload: KitaSchema = {
      ...basePayload,
      UserItems: {
        ...basePayload.UserItems,
        Tags: [{ id: "imported-tag", name: "Isekai", code: "SHARED_CODE", created_at: 1700000000000 }],
      },
    };

    await importFromJSON(buildFile(payload));

    expect(mockGetTagByCode).toHaveBeenCalledWith("SHARED_CODE");
    expect(mockDeleteTagById).toHaveBeenCalledWith("local-test-tag");
    expect(mockAddTag).toHaveBeenCalledWith(expect.objectContaining({ id: "imported-tag", code: "SHARED_CODE" }));
    const deleteOrder = mockDeleteTagById.mock.invocationCallOrder[0];
    const addOrder = mockAddTag.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(addOrder);
  });

  test("does not delete anything when no local tag shares the imported one's code", async () => {
    mockGetTagByCode.mockResolvedValue(undefined);
    const payload: KitaSchema = {
      ...basePayload,
      UserItems: {
        ...basePayload.UserItems,
        Tags: [{ id: "imported-tag", name: "Isekai", code: "UNIQUE_CODE", created_at: 1700000000000 }],
      },
    };

    await importFromJSON(buildFile(payload));

    expect(mockDeleteTagById).not.toHaveBeenCalled();
    expect(mockAddTag).toHaveBeenCalledWith(expect.objectContaining({ id: "imported-tag", code: "UNIQUE_CODE" }));
  });

  test("derives the fallback code from the tag name before checking for a conflict when code is absent", async () => {
    mockGetTagByCode.mockResolvedValue(undefined);
    const payload: KitaSchema = {
      ...basePayload,
      UserItems: {
        ...basePayload.UserItems,
        Tags: [{ id: "imported-tag", name: "Slice of Life", created_at: 1700000000000 } as ITag],
      },
    };

    await importFromJSON(buildFile(payload));

    expect(mockGetTagByCode).toHaveBeenCalledWith("SLICE_OF_LIFE");
  });

  test("tombstones a conflicting local video before importing one that shares its unique_code under a different id", async () => {
    mockGetVideoByUniqueCode.mockResolvedValue({ id: "local-test-video", unique_code: "SHARED_CODE" });
    const payload: KitaSchema = {
      ...basePayload,
      UserItems: {
        ...basePayload.UserItems,
        Videos: [
          {
            id: "imported-video",
            unique_code: "SHARED_CODE",
            video_title: "Real Video",
            video_duration: 100,
            video_url: "https://example.com",
            origin: SiteKey.CRUNCHYROLL,
            created_at: 1700000000000,
            updated_at: 1700000000000,
          },
        ],
      },
    };

    await importFromJSON(buildFile(payload));

    expect(mockGetVideoByUniqueCode).toHaveBeenCalledWith("SHARED_CODE");
    expect(mockDeleteVideoById).toHaveBeenCalledWith("local-test-video");
    expect(mockAddVideo).toHaveBeenCalledWith(expect.objectContaining({ id: "imported-video", unique_code: "SHARED_CODE" }));
    // The conflicting local video must be cleared before the imported one is written, or the
    // real IndexedDB unique index on unique_code would reject the write with a ConstraintError.
    const deleteOrder = mockDeleteVideoById.mock.invocationCallOrder[0];
    const addOrder = mockAddVideo.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(addOrder);
  });

  test("does not delete anything when no local video shares the imported one's unique_code", async () => {
    mockGetVideoByUniqueCode.mockResolvedValue(undefined);
    const payload: KitaSchema = {
      ...basePayload,
      UserItems: {
        ...basePayload.UserItems,
        Videos: [
          {
            id: "imported-video",
            unique_code: "UNIQUE_CODE",
            video_title: "Real Video",
            video_duration: 100,
            video_url: "https://example.com",
            origin: SiteKey.CRUNCHYROLL,
            created_at: 1700000000000,
            updated_at: 1700000000000,
          },
        ],
      },
    };

    await importFromJSON(buildFile(payload));

    expect(mockDeleteVideoById).not.toHaveBeenCalled();
    expect(mockAddVideo).toHaveBeenCalledWith(expect.objectContaining({ id: "imported-video", unique_code: "UNIQUE_CODE" }));
  });

  test("does not delete the existing video when the unique_code match is the same video (same id)", async () => {
    mockGetVideoByUniqueCode.mockResolvedValue({ id: "same-video", unique_code: "SAME_CODE" });
    const payload: KitaSchema = {
      ...basePayload,
      UserItems: {
        ...basePayload.UserItems,
        Videos: [
          {
            id: "same-video",
            unique_code: "SAME_CODE",
            video_title: "Real Video",
            video_duration: 100,
            video_url: "https://example.com",
            origin: SiteKey.CRUNCHYROLL,
            created_at: 1700000000000,
            updated_at: 1700000000000,
          },
        ],
      },
    };

    await importFromJSON(buildFile(payload));

    expect(mockDeleteVideoById).not.toHaveBeenCalled();
    expect(mockAddVideo).toHaveBeenCalledWith(expect.objectContaining({ id: "same-video" }));
  });

  test("applies theme and per-source auto-track/auto-sync settings", async () => {
    await importFromJSON(buildFile(basePayload));

    expect(await settingsManager.get(SETTINGS.application.theme)).toBe("dark");
    expect(await settingsManager.get(SETTINGS.sources.crunchyroll.autoTrack)).toEqual({ enabled: true, watchPercentage: 85 });
    expect(await settingsManager.get(SETTINGS.sources.crunchyroll.autoSync)).toEqual({ enabled: true });
    expect(await settingsManager.get(SETTINGS.sources.youtube.autoTrack)).toEqual({ enabled: true, watchPercentage: 75 });
    expect(await settingsManager.get(SETTINGS.sources.youtube.autoSync)).toEqual({ enabled: false });
  });

  test("applies the imported AniList pending sync queue", async () => {
    const payload: KitaSchema = {
      ...basePayload,
      UserItems: {
        ...basePayload.UserItems,
        AnilistPendingSync: [
          {
            id: "p1",
            video_id: "v1",
            series_title: "Naruto",
            source_platform: "crunchyroll",
            search_results: [],
            created_at: 1,
          },
        ],
      },
    };

    await importFromJSON(buildFile(payload));

    const pending = await settingsManager.get(SETTINGS.integrations.anilist.pendingSync);
    expect(pending).toHaveLength(1);
    expect(pending[0].series_title).toBe("Naruto");
  });

  test("falls back to safe defaults when importing a legacy export missing the new fields", async () => {
    const legacyPayload = {
      UserItems: { Videos: [], Tags: [], VideoTagRelationships: [], AutoTags: [], SeriesMappings: [] },
      ApplicationSettings: {
        IsReady: false,
        IsApplicationEnabled: true,
        IsContentScriptEnabled: true,
        AnilistSyncMedia: true,
        StorageKeys: {},
      },
      Statistics: { VideoStatistics: { TotalVideos: 0, TotalDurationSeconds: 0 }, TagStatistics: { TotalTags: 0 } },
    };

    await importFromJSON(buildFile(legacyPayload));

    expect(await settingsManager.get(SETTINGS.application.theme)).toBe(SETTINGS.application.theme.defaultValue);
    expect(await settingsManager.get(SETTINGS.sources.crunchyroll.autoTrack)).toEqual(SETTINGS.sources.crunchyroll.autoTrack.defaultValue);
    expect(await settingsManager.get(SETTINGS.integrations.anilist.pendingSync)).toEqual([]);
  });
});
