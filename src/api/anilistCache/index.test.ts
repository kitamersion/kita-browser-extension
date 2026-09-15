import db from "@/db";
import { categorizeCacheKey, clearAllCache, clearCacheCategory, deleteCacheEntry, getCategorizedCacheEntries } from "./index";

describe("categorizeCacheKey", () => {
  test.each([
    ["profile", "profile"],
    ["list:123:CURRENT", "lists"],
    ["genreCollection", "collections"],
    ["tagCollection", "collections"],
    ["search:abc123", "search"],
    ["something-unexpected", "other"],
  ])("categorizes %s as %s", (key, expected) => {
    expect(categorizeCacheKey(key)).toBe(expected);
  });
});

describe("getCategorizedCacheEntries / clearCacheCategory / deleteCacheEntry / clearAllCache", () => {
  beforeAll(async () => {
    await db.openDatabase();
  });

  beforeEach(async () => {
    await db.clearAniListCache();
  });

  test("groups rows by category, in a fixed category order, with sizes computed", async () => {
    await db.setAniListCache("profile", { name: "A" }, 60_000);
    await db.setAniListCache("search:abc", { media: [] }, 60_000);

    const summaries = await getCategorizedCacheEntries();

    expect(summaries.map((s) => s.category)).toEqual(["profile", "lists", "collections", "search", "other"]);

    const profileSummary = summaries.find((s) => s.category === "profile")!;
    expect(profileSummary.entries).toHaveLength(1);
    expect(profileSummary.totalSizeBytes).toBeGreaterThan(0);

    const listsSummary = summaries.find((s) => s.category === "lists")!;
    expect(listsSummary.entries).toHaveLength(0);
    expect(listsSummary.totalSizeBytes).toBe(0);
  });

  test("clearCacheCategory deletes only keys belonging to that category", async () => {
    await db.setAniListCache("profile", {}, 60_000);
    await db.setAniListCache("list:1:CURRENT", {}, 60_000);

    await clearCacheCategory("lists");

    const remainingKeys = (await db.getAllAniListCacheEntries()).map((row) => row.key);
    expect(remainingKeys).toEqual(["profile"]);
  });

  test("deleteCacheEntry removes a single key", async () => {
    await db.setAniListCache("profile", {}, 60_000);

    await deleteCacheEntry("profile");

    expect(await db.getAllAniListCacheEntries()).toEqual([]);
  });

  test("clearAllCache empties the whole store", async () => {
    await db.setAniListCache("profile", {}, 60_000);
    await db.setAniListCache("search:abc", {}, 60_000);

    await clearAllCache();

    expect(await db.getAllAniListCacheEntries()).toEqual([]);
  });
});
