import { getSourceAutoSyncConfig, getSourceAutoTrackConfig, setSourceAutoSyncConfig, setSourceAutoTrackConfig } from "./index";

const createChromeStorageStub = () => {
  const store: Record<string, any> = {};
  return {
    storage: {
      local: {
        get: (key: string, callback: (data: any) => void) => {
          callback({ [key]: store[key] });
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

describe("getSourceAutoTrackConfig", () => {
  test("returns the default disabled config when nothing has been saved yet", async () => {
    const config = await getSourceAutoTrackConfig("crunchyroll");

    expect(config).toEqual({ enabled: false, watchPercentage: 80 });
  });

  test("returns a safe disabled default for a platform that isn't wired up yet", async () => {
    const config = await getSourceAutoTrackConfig("netflix");

    expect(config).toEqual({ enabled: false, watchPercentage: 80 });
  });
});

describe("setSourceAutoTrackConfig", () => {
  test("round-trips a saved config for the given platform", async () => {
    await setSourceAutoTrackConfig("crunchyroll", { enabled: true, watchPercentage: 90 });

    const config = await getSourceAutoTrackConfig("crunchyroll");

    expect(config).toEqual({ enabled: true, watchPercentage: 90 });
  });

  test("keeps each platform's config independent", async () => {
    await setSourceAutoTrackConfig("crunchyroll", { enabled: true, watchPercentage: 90 });

    const youtubeConfig = await getSourceAutoTrackConfig("youtube");

    expect(youtubeConfig).toEqual({ enabled: false, watchPercentage: 80 });
  });
});

describe("getSourceAutoSyncConfig", () => {
  test("defaults to disabled when nothing has been saved yet", async () => {
    const config = await getSourceAutoSyncConfig("crunchyroll");

    expect(config).toEqual({ enabled: false });
  });

  test("returns a safe disabled default for a platform that isn't wired up yet", async () => {
    const config = await getSourceAutoSyncConfig("netflix");

    expect(config).toEqual({ enabled: false });
  });
});

describe("setSourceAutoSyncConfig", () => {
  test("round-trips a saved config for the given platform", async () => {
    await setSourceAutoSyncConfig("crunchyroll", { enabled: true });

    const config = await getSourceAutoSyncConfig("crunchyroll");

    expect(config).toEqual({ enabled: true });
  });

  test("is independent from that platform's autoTrack config", async () => {
    await setSourceAutoSyncConfig("crunchyroll", { enabled: true });

    const autoTrackConfig = await getSourceAutoTrackConfig("crunchyroll");

    expect(autoTrackConfig).toEqual({ enabled: false, watchPercentage: 80 });
  });
});
