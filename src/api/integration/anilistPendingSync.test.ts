import { addPendingAnilistSync, getPendingAnilistSyncs, removePendingAnilistSync } from "./anilistPendingSync";

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

const buildEntry = () => ({
  video_id: "video-1",
  series_title: "Dragon Ball",
  source_platform: "crunchyroll" as const,
  season_year: 1989,
  search_results: [{ id: 1, title: { english: "Dragon Ball" } }],
});

describe("getPendingAnilistSyncs", () => {
  test("returns an empty list when nothing is pending", async () => {
    expect(await getPendingAnilistSyncs()).toEqual([]);
  });
});

describe("addPendingAnilistSync", () => {
  test("adds an entry with a generated id and timestamp", async () => {
    const added = await addPendingAnilistSync(buildEntry());

    expect(added.id).toEqual(expect.any(String));
    expect(added.created_at).toEqual(expect.any(Number));
    expect(added.series_title).toBe("Dragon Ball");

    const all = await getPendingAnilistSyncs();
    expect(all).toEqual([added]);
  });

  test("appends to existing pending entries rather than replacing them", async () => {
    const first = await addPendingAnilistSync(buildEntry());
    const second = await addPendingAnilistSync({ ...buildEntry(), video_id: "video-2", series_title: "Naruto" });

    const all = await getPendingAnilistSyncs();
    expect(all).toEqual([first, second]);
  });
});

describe("removePendingAnilistSync", () => {
  test("removes only the matching entry", async () => {
    const first = await addPendingAnilistSync(buildEntry());
    const second = await addPendingAnilistSync({ ...buildEntry(), video_id: "video-2", series_title: "Naruto" });

    await removePendingAnilistSync(first.id);

    expect(await getPendingAnilistSyncs()).toEqual([second]);
  });
});
