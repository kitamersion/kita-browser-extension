jest.mock("./supabaseClient", () => ({ getSupabaseClient: jest.fn() }));
jest.mock("./auth", () => ({ getSession: jest.fn() }));
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
import IndexedDB from "@/db/index";
import { runSync } from "./syncEngine";

const emptyTable = () => ({
  select: jest.fn().mockReturnThis(),
  gt: jest.fn().mockResolvedValue({ data: [], error: null }),
  upsert: jest.fn().mockResolvedValue({ error: null }),
});

describe("runSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (IndexedDB.getLastSyncedAt as jest.Mock).mockResolvedValue(0);
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([]);
    (IndexedDB.getAllVideos as jest.Mock).mockResolvedValue([]);
    (IndexedDB.getAllVideoTags as jest.Mock).mockResolvedValue([]);
    (IndexedDB.getAllAutoTags as jest.Mock).mockResolvedValue([]);
  });

  test("returns no-session and touches nothing when the user isn't signed in", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: null, email: null });

    const result = await runSync();

    expect(result.status).toBe("no-session");
    expect(getSupabaseClient).not.toHaveBeenCalled();
    expect(IndexedDB.setLastSyncedAt).not.toHaveBeenCalled();
  });

  test("advances the cursor on a clean sync with no data on either side", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: () => emptyTable() });

    const result = await runSync();

    expect(result.status).toBe("ok");
    expect(IndexedDB.setLastSyncedAt).toHaveBeenCalledWith(expect.any(Number));
  });

  test("returns quota-exceeded and does not advance the cursor when a push is rejected", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "t1", name: "Anime", updated_at: 1 }]);
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValue({ data: [], error: null }),
        upsert: jest.fn().mockResolvedValue({ error: { message: "storage quota exceeded" } }),
      }),
    });

    const result = await runSync();

    expect(result.status).toBe("quota-exceeded");
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
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: (tableName: string) => (tableName === "tags" ? { ...emptyTable(), upsert } : emptyTable()),
    });

    const result = await runSync();

    expect(result.status).toBe("ok");
    expect(upsert).toHaveBeenCalledWith([expect.objectContaining({ id: "t1", deleted_at: 5 })]);
  });

  test("resolves with status error instead of rejecting when the write-back step throws", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "a@b.com" });
    (getSupabaseClient as jest.Mock).mockReturnValue({ from: () => emptyTable() });
    (IndexedDB.replaceAllTags as jest.Mock).mockRejectedValue(new Error("Database not initialized"));

    const result = await runSync();

    expect(result.status).toBe("error");
    expect(result.message).toEqual(expect.stringContaining("Database not initialized"));
    expect(IndexedDB.setLastSyncedAt).not.toHaveBeenCalled();
  });
});
