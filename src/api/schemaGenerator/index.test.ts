import { SETTINGS, settingsManager } from "@/api/settings";
import { getKitaSchema } from "./index";

jest.mock("@/db/index", () => ({
  __esModule: true,
  default: {
    getAllVideos: jest.fn().mockResolvedValue([]),
    getAllTags: jest.fn().mockResolvedValue([]),
    getAllVideoTags: jest.fn().mockResolvedValue([]),
    getAllAutoTags: jest.fn().mockResolvedValue([]),
    getAllSeriesMappings: jest.fn().mockResolvedValue([]),
  },
}));

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
});

describe("getKitaSchema", () => {
  test("falls back to each setting's default when nothing has been saved yet", async () => {
    const schema = await getKitaSchema();

    expect(schema.ApplicationSettings.Theme).toBe("light");
    expect(schema.ApplicationSettings.SourceAutoTrack).toEqual({
      Crunchyroll: { AutoTrack: { enabled: false, watchPercentage: 80 }, AutoSync: { enabled: false } },
      Youtube: { AutoTrack: { enabled: false, watchPercentage: 80 }, AutoSync: { enabled: false } },
    });
    expect(schema.UserItems.AnilistPendingSync).toEqual([]);
  });

  test("reflects saved theme, pending sync queue, and per-source auto-track/auto-sync settings", async () => {
    await Promise.all([
      settingsManager.set(SETTINGS.application.theme, "dark"),
      settingsManager.set(SETTINGS.sources.crunchyroll.autoTrack, { enabled: true, watchPercentage: 90 }),
      settingsManager.set(SETTINGS.sources.crunchyroll.autoSync, { enabled: true }),
      settingsManager.set(SETTINGS.sources.youtube.autoTrack, { enabled: true, watchPercentage: 70 }),
      settingsManager.set(SETTINGS.integrations.anilist.pendingSync, [
        {
          id: "pending-1",
          video_id: "video-1",
          series_title: "Dragon Ball",
          source_platform: "crunchyroll",
          search_results: [],
          created_at: 1700000000000,
        },
      ]),
    ]);

    const schema = await getKitaSchema();

    expect(schema.ApplicationSettings.Theme).toBe("dark");
    expect(schema.ApplicationSettings.SourceAutoTrack.Crunchyroll).toEqual({
      AutoTrack: { enabled: true, watchPercentage: 90 },
      AutoSync: { enabled: true },
    });
    expect(schema.ApplicationSettings.SourceAutoTrack.Youtube.AutoTrack).toEqual({ enabled: true, watchPercentage: 70 });
    expect(schema.UserItems.AnilistPendingSync).toHaveLength(1);
    expect(schema.UserItems.AnilistPendingSync[0].series_title).toBe("Dragon Ball");
  });
});
