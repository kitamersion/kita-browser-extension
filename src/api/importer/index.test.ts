import { KitaSchema } from "@/types/kitaschema";
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
  },
}));

const mockAddTag = IndexedDB.addTag as jest.Mock;

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
