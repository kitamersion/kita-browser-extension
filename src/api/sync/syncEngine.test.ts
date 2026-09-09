jest.mock("./supabaseClient", () => ({ getSupabaseClient: jest.fn() }));
jest.mock("./auth", () => ({ getSession: jest.fn() }));
jest.mock("@/api/settings/manager", () => ({ settingsManager: { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined) } }));
jest.mock("./rekeyLocalData", () => ({ rekeyLocalDataForNewAccount: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/db/index", () => ({
  __esModule: true,
  default: {
    getLastSyncedAt: jest.fn(),
    setLastSyncedAt: jest.fn(),
    getAllTags: jest.fn(),
    getAllVideos: jest.fn(),
    getAllVideoTags: jest.fn(),
    getAllAutoTags: jest.fn(),
    replaceAllTags: jest.fn(),
    replaceAllVideos: jest.fn(),
    replaceAllVideoTags: jest.fn(),
    replaceAllAutoTags: jest.fn(),
  },
}));

import { getSupabaseClient } from "./supabaseClient";
import { getSession } from "./auth";
import { settingsManager } from "@/api/settings/manager";
import { SETTINGS } from "@/api/settings/definitions";
import { rekeyLocalDataForNewAccount } from "./rekeyLocalData";
import IndexedDB from "@/db/index";
import { runSync } from "./syncEngine";

type TableMockOptions = {
  // One entry per expected .range() call, in order. Defaults to a single empty page.
  pages?: Record<string, unknown>[][];
  upsert?: jest.Mock;
  pullError?: { message: string };
};

// Mirrors the PostgREST builder chain the pull uses: select -> gt -> order -> range (awaited).
// The page counter lives outside the builder because runSync calls client.from() once per page.
const tableMock = ({ pages = [[]], upsert, pullError }: TableMockOptions = {}) => {
  let pageIndex = 0;
  const range = jest.fn().mockImplementation(() => {
    if (pullError) return Promise.resolve({ data: null, error: pullError });
    const page = pages[pageIndex] ?? [];
    pageIndex++;
    return Promise.resolve({ data: page, error: null });
  });
  const upsertMock = upsert ?? jest.fn().mockResolvedValue({ error: null });

  const builder: { select: jest.Mock; gt: jest.Mock; order: jest.Mock; range: jest.Mock; upsert: jest.Mock } = {
    select: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range,
    upsert: upsertMock,
  };
  return builder;
};

// Returns a client whose per-table builders are stable across from() calls, so page counters and
// call assertions survive the pull loop.
const clientWithTables = (tables: Record<string, ReturnType<typeof tableMock>>) => {
  const fallback: Record<string, ReturnType<typeof tableMock>> = {};
  return {
    from: (tableName: string) => {
      if (tables[tableName]) return tables[tableName];
      if (!fallback[tableName]) fallback[tableName] = tableMock();
      return fallback[tableName];
    },
  };
};

const emptyClient = () => clientWithTables({});

describe("runSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (IndexedDB.getLastSyncedAt as jest.Mock).mockResolvedValue(0);
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([]);
    (IndexedDB.getAllVideos as jest.Mock).mockResolvedValue([]);
    (IndexedDB.getAllVideoTags as jest.Mock).mockResolvedValue([]);
    (IndexedDB.getAllAutoTags as jest.Mock).mockResolvedValue([]);
    (IndexedDB.replaceAllTags as jest.Mock).mockResolvedValue(undefined);
    (IndexedDB.replaceAllVideos as jest.Mock).mockResolvedValue(undefined);
    (IndexedDB.replaceAllVideoTags as jest.Mock).mockResolvedValue(undefined);
    (IndexedDB.replaceAllAutoTags as jest.Mock).mockResolvedValue(undefined);
    (settingsManager.get as jest.Mock).mockImplementation((setting: unknown) => {
      if (setting === SETTINGS.kitaSync.lastSyncedAccountId) return Promise.resolve(null);
      return Promise.resolve(false);
    });
  });

  test("returns no-session and touches nothing when the user isn't signed in", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: null, email: null });

    const result = await runSync();

    expect(result.status).toBe("no-session");
    expect(getSupabaseClient).not.toHaveBeenCalled();
    expect(IndexedDB.setLastSyncedAt).not.toHaveBeenCalled();
  });

  test("returns paused and touches nothing when Kita Sync is paused", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (settingsManager.get as jest.Mock).mockImplementation((setting: unknown) => {
      if (setting === SETTINGS.kitaSync.paused) return Promise.resolve(true);
      if (setting === SETTINGS.kitaSync.lastSyncedAccountId) return Promise.resolve(null);
      return Promise.resolve(false);
    });

    const result = await runSync();

    expect(result.status).toBe("paused");
    expect(getSupabaseClient).not.toHaveBeenCalled();
    expect(IndexedDB.setLastSyncedAt).not.toHaveBeenCalled();
  });

  test("returns paused and does not push when Kita Sync is paused mid-flight, after the top-of-function check passed", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    let pausedCallCount = 0;
    (settingsManager.get as jest.Mock).mockImplementation((setting: unknown) => {
      if (setting === SETTINGS.kitaSync.lastSyncedAccountId) return Promise.resolve(null);
      if (setting === SETTINGS.kitaSync.paused) {
        pausedCallCount += 1;
        return Promise.resolve(pausedCallCount > 1);
      }
      return Promise.resolve(false);
    });
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "t1", name: "Anime", updated_at: 1 }]);
    const upsert = jest.fn().mockResolvedValue({ error: null });
    (getSupabaseClient as jest.Mock).mockReturnValue(clientWithTables({ tags: tableMock({ upsert }) }));

    const result = await runSync();

    expect(result.status).toBe("paused");
    expect(upsert).not.toHaveBeenCalled();
    expect(IndexedDB.setLastSyncedAt).not.toHaveBeenCalled();
  });

  test("rekeys local data and records the new account when the signed-in account differs from the last synced one", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-2", email: "b@b.com" });
    (settingsManager.get as jest.Mock).mockImplementation((setting: unknown) => {
      if (setting === SETTINGS.kitaSync.lastSyncedAccountId) return Promise.resolve("user-1");
      return Promise.resolve(false);
    });
    (getSupabaseClient as jest.Mock).mockReturnValue(emptyClient());

    const result = await runSync();

    expect(rekeyLocalDataForNewAccount).toHaveBeenCalled();
    expect(settingsManager.set).toHaveBeenCalledWith(SETTINGS.kitaSync.lastSyncedAccountId, "user-2");
    expect(settingsManager.set).toHaveBeenCalledWith(SETTINGS.kitaSync.pendingRekeyNotice, true);
    expect(result.rekeyed).toBe(true);
    expect(result.status).toBe("ok");
  });

  test("resolves with status error instead of rejecting when the rekey step throws", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-2", email: "b@b.com" });
    (settingsManager.get as jest.Mock).mockImplementation((setting: unknown) => {
      if (setting === SETTINGS.kitaSync.lastSyncedAccountId) return Promise.resolve("user-1");
      return Promise.resolve(false);
    });
    (rekeyLocalDataForNewAccount as jest.Mock).mockRejectedValueOnce(new Error("Database not initialized"));
    (getSupabaseClient as jest.Mock).mockReturnValue(emptyClient());

    const result = await runSync();

    expect(result.status).toBe("error");
    expect(result.message).toEqual(expect.stringContaining("Database not initialized"));
    expect(result.rekeyed).toBe(false);
    expect(settingsManager.set).not.toHaveBeenCalledWith(SETTINGS.kitaSync.lastSyncedAccountId, expect.anything());
  });

  test("does not rekey when the signed-in account matches the last synced account", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (settingsManager.get as jest.Mock).mockImplementation((setting: unknown) => {
      if (setting === SETTINGS.kitaSync.lastSyncedAccountId) return Promise.resolve("user-1");
      return Promise.resolve(false);
    });
    (getSupabaseClient as jest.Mock).mockReturnValue(emptyClient());

    const result = await runSync();

    expect(rekeyLocalDataForNewAccount).not.toHaveBeenCalled();
    expect(settingsManager.set).not.toHaveBeenCalledWith(SETTINGS.kitaSync.lastSyncedAccountId, expect.anything());
    expect(result.rekeyed).toBeFalsy();
  });

  test("does not rekey on the very first sync for a device, but still records the account", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (settingsManager.get as jest.Mock).mockImplementation((setting: unknown) => {
      if (setting === SETTINGS.kitaSync.lastSyncedAccountId) return Promise.resolve(null);
      return Promise.resolve(false);
    });
    (getSupabaseClient as jest.Mock).mockReturnValue(emptyClient());

    const result = await runSync();

    expect(rekeyLocalDataForNewAccount).not.toHaveBeenCalled();
    expect(settingsManager.set).toHaveBeenCalledWith(SETTINGS.kitaSync.lastSyncedAccountId, "user-1");
    expect(result.rekeyed).toBeFalsy();
  });

  test("advances the cursor on a clean sync with no data on either side", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (getSupabaseClient as jest.Mock).mockReturnValue(emptyClient());

    const result = await runSync();

    expect(result.status).toBe("ok");
    expect(IndexedDB.setLastSyncedAt).toHaveBeenCalledWith(expect.any(Number));
  });

  test("returns quota-exceeded and does not advance the cursor when a push is rejected", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "t1", name: "Anime", updated_at: 1 }]);
    (getSupabaseClient as jest.Mock).mockReturnValue(
      clientWithTables({
        tags: tableMock({ upsert: jest.fn().mockResolvedValue({ error: { message: "storage quota exceeded" } }) }),
      })
    );

    const result = await runSync();

    expect(result.status).toBe("quota-exceeded");
    expect(IndexedDB.setLastSyncedAt).not.toHaveBeenCalled();
  });

  test("returns error and does not advance the cursor when a pull fails", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    const upsert = jest.fn().mockResolvedValue({ error: null });
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "t1", name: "Anime", updated_at: 1 }]);
    (getSupabaseClient as jest.Mock).mockReturnValue(
      clientWithTables({ tags: tableMock({ upsert, pullError: { message: "network unreachable" } }) })
    );

    const result = await runSync();

    expect(result.status).toBe("error");
    expect(result.message).toBe("network unreachable");
    // The pull runs first, so a failed pull must abort before anything is uploaded.
    expect(upsert).not.toHaveBeenCalled();
    expect(IndexedDB.setLastSyncedAt).not.toHaveBeenCalled();
  });

  test("includes a locally tombstoned tag in the push payload so the deletion propagates remotely", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    const tombstonedTag = { id: "t1", name: "Anime", code: "ANIME", updated_at: 5, deleted_at: 5 };
    // Mirrors real IndexedDB behavior: excluded by default, included when includeDeleted is true.
    (IndexedDB.getAllTags as jest.Mock).mockImplementation((includeDeleted?: boolean) =>
      Promise.resolve(includeDeleted ? [tombstonedTag] : [])
    );

    const upsert = jest.fn().mockResolvedValue({ error: null });
    (getSupabaseClient as jest.Mock).mockReturnValue(clientWithTables({ tags: tableMock({ upsert }) }));

    const result = await runSync();

    expect(result.status).toBe("ok");
    expect(upsert).toHaveBeenCalledWith([expect.objectContaining({ id: "t1", deleted_at: 5 })]);
  });

  test("resolves with status error instead of rejecting when the write-back step throws", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (getSupabaseClient as jest.Mock).mockReturnValue(emptyClient());
    (IndexedDB.replaceAllTags as jest.Mock).mockRejectedValue(new Error("Database not initialized"));

    const result = await runSync();

    expect(result.status).toBe("error");
    expect(result.message).toEqual(expect.stringContaining("Database not initialized"));
    expect(IndexedDB.setLastSyncedAt).not.toHaveBeenCalled();
  });

  test("pulls every page of a truncated result set, not just the first", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });

    const page = (offset: number, size: number) =>
      Array.from({ length: size }, (_, i) => ({
        id: `v-${offset + i}`,
        video_title: `Video ${offset + i}`,
        unique_code: `CODE_${offset + i}`,
        updated_at: offset + i + 1,
      }));
    // PostgREST caps a response at max_rows (1000); two full pages then a short one means "done".
    const videos = tableMock({ pages: [page(0, 1000), page(1000, 1000), page(2000, 5)] });
    (getSupabaseClient as jest.Mock).mockReturnValue(clientWithTables({ videos }));

    const result = await runSync();

    expect(result.status).toBe("ok");
    expect(videos.range).toHaveBeenCalledTimes(3);
    expect(videos.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(videos.range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(videos.range).toHaveBeenNthCalledWith(3, 2000, 2999);

    const writtenBack = (IndexedDB.replaceAllVideos as jest.Mock).mock.calls[0][0];
    expect(writtenBack).toHaveLength(2005);
    expect(writtenBack.map((row: { id: string }) => row.id)).toContain("v-2004");
  });

  test("stops paging as soon as a page comes back empty", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    const tags = tableMock({ pages: [[]] });
    (getSupabaseClient as jest.Mock).mockReturnValue(clientWithTables({ tags }));

    await runSync();

    expect(tags.range).toHaveBeenCalledTimes(1);
  });

  test("pushes the canonical remote id, not a duplicate, when two devices created the same tag", async () => {
    // Device A already pushed a tag coded ANIME under its own id. Device B seeded the same default
    // tag locally under a different id and has never synced. B must recognise the collision on pull
    // and upsert onto the remote row, rather than creating a second permanent remote ANIME row.
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "local-anime-id", name: "Anime", code: "ANIME", updated_at: 20 }]);

    const upsert = jest.fn().mockResolvedValue({ error: null });
    const tags = tableMock({
      pages: [[{ id: "remote-anime-id", name: "Anime", code: "ANIME", updated_at: 10 }]],
      upsert,
    });
    (getSupabaseClient as jest.Mock).mockReturnValue(clientWithTables({ tags }));

    const result = await runSync();

    expect(result.status).toBe("ok");
    expect(upsert).toHaveBeenCalledTimes(1);
    const pushed = upsert.mock.calls[0][0];
    expect(pushed).toHaveLength(1);
    expect(pushed[0]).toEqual(expect.objectContaining({ id: "remote-anime-id", code: "ANIME", user_id: "user-1" }));
    expect(pushed.map((row: { id: string }) => row.id)).not.toContain("local-anime-id");

    // The local write-back collapses to the single canonical row too.
    const writtenBack = (IndexedDB.replaceAllTags as jest.Mock).mock.calls[0][0];
    expect(writtenBack.map((row: { id: string }) => row.id)).toEqual(["remote-anime-id"]);
  });

  test("remaps video_tags foreign keys onto canonical ids before pushing them", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "local-tag", name: "Anime", code: "ANIME", updated_at: 20 }]);
    (IndexedDB.getAllVideos as jest.Mock).mockResolvedValue([
      { id: "local-video", video_title: "Ep 1", unique_code: "EP1", updated_at: 20 },
    ]);
    (IndexedDB.getAllVideoTags as jest.Mock).mockResolvedValue([
      { id: "local-vt", video_id: "local-video", tag_id: "local-tag", updated_at: 20 },
    ]);

    const videoTagsUpsert = jest.fn().mockResolvedValue({ error: null });
    (getSupabaseClient as jest.Mock).mockReturnValue(
      clientWithTables({
        tags: tableMock({ pages: [[{ id: "remote-tag", name: "Anime", code: "ANIME", updated_at: 10 }]] }),
        videos: tableMock({ pages: [[{ id: "remote-video", video_title: "Ep 1", unique_code: "EP1", updated_at: 10 }]] }),
        video_tags: tableMock({ upsert: videoTagsUpsert }),
      })
    );

    const result = await runSync();

    expect(result.status).toBe("ok");
    expect(videoTagsUpsert).toHaveBeenCalledWith([
      expect.objectContaining({ id: "local-vt", video_id: "remote-video", tag_id: "remote-tag" }),
    ]);
  });

  test("pushes the canonical remote id, not a duplicate, for a video_tags link that already exists remotely under a different id", async () => {
    // A rekey (or any local id churn) can hand this link a fresh id even though the same link
    // already exists remotely — the push must recognise that by (video_id, tag_id) and update the
    // existing row, not create a second permanent remote row for the same link.
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (IndexedDB.getAllVideoTags as jest.Mock).mockResolvedValue([{ id: "fresh-vt-id", video_id: "v1", tag_id: "t1", updated_at: 20 }]);

    const videoTagsUpsert = jest.fn().mockResolvedValue({ error: null });
    const videoTags = tableMock({
      pages: [[{ id: "remote-vt-id", video_id: "v1", tag_id: "t1", updated_at: 10 }]],
      upsert: videoTagsUpsert,
    });
    (getSupabaseClient as jest.Mock).mockReturnValue(clientWithTables({ video_tags: videoTags }));

    const result = await runSync();

    expect(result.status).toBe("ok");
    expect(videoTagsUpsert).toHaveBeenCalledTimes(1);
    const pushed = videoTagsUpsert.mock.calls[0][0];
    expect(pushed).toHaveLength(1);
    expect(pushed[0]).toEqual(expect.objectContaining({ id: "remote-vt-id" }));
    expect(pushed.map((row: { id: string }) => row.id)).not.toContain("fresh-vt-id");

    const writtenBack = (IndexedDB.replaceAllVideoTags as jest.Mock).mock.calls[0][0];
    expect(writtenBack.map((row: { id: string }) => row.id)).toEqual(["remote-vt-id"]);
  });

  test("pushes only one row per (video_id, tag_id) pair when local rows duplicate a link", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (IndexedDB.getAllVideoTags as jest.Mock).mockResolvedValue([
      { id: "vt-old", video_id: "v1", tag_id: "t1", updated_at: 5 },
      { id: "vt-new", video_id: "v1", tag_id: "t1", updated_at: 9 },
    ]);

    const videoTagsUpsert = jest.fn().mockResolvedValue({ error: null });
    (getSupabaseClient as jest.Mock).mockReturnValue(clientWithTables({ video_tags: tableMock({ upsert: videoTagsUpsert }) }));

    const result = await runSync();

    expect(result.status).toBe("ok");
    const pushed = videoTagsUpsert.mock.calls[0][0];
    expect(pushed).toHaveLength(1);
    expect(pushed[0]).toEqual(expect.objectContaining({ id: "vt-new" }));
  });

  test("reports how many rows were pulled and pushed across all four tables", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "t1", name: "Anime", code: "ANIME", updated_at: 20 }]);
    (IndexedDB.getAllVideos as jest.Mock).mockResolvedValue([{ id: "v1", video_title: "Ep 1", unique_code: "EP1", updated_at: 20 }]);

    (getSupabaseClient as jest.Mock).mockReturnValue(
      clientWithTables({
        // 2 remote tags pulled; 1 local tag pushed (doesn't match either by code, so no remap).
        tags: tableMock({
          pages: [
            [
              { id: "remote-tag-1", name: "Manga", code: "MANGA", updated_at: 5 },
              { id: "remote-tag-2", name: "OVA", code: "OVA", updated_at: 6 },
            ],
          ],
        }),
        // 0 remote videos pulled; 1 local video pushed.
        videos: tableMock({ pages: [[]] }),
      })
    );

    const result = await runSync();

    expect(result.status).toBe("ok");
    expect(result.pulled).toBe(2);
    expect(result.pushed).toBe(2);
  });

  test("collapses pre-existing remote duplicates of the same (video_id, tag_id) pair on write-back", async () => {
    // The remote table has no unique constraint on the pair, so two rows for the same link can
    // already exist there under different ids (e.g. pushed before this reconciliation existed).
    // The local write-back must still converge to one row per pair, keeping the newer one.
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    const videoTags = tableMock({
      pages: [
        [
          { id: "remote-old", video_id: "v1", tag_id: "t1", updated_at: 5 },
          { id: "remote-new", video_id: "v1", tag_id: "t1", updated_at: 9 },
        ],
      ],
    });
    (getSupabaseClient as jest.Mock).mockReturnValue(clientWithTables({ video_tags: videoTags }));

    const result = await runSync();

    expect(result.status).toBe("ok");
    const writtenBack = (IndexedDB.replaceAllVideoTags as jest.Mock).mock.calls[0][0];
    expect(writtenBack).toHaveLength(1);
    expect(writtenBack[0]).toEqual(expect.objectContaining({ id: "remote-new" }));
  });
});
