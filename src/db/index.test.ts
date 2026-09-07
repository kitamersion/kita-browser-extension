import IndexedDB from "./index";
import { SiteKey } from "@/types/video";

describe("IndexedDB.addTag", () => {
  beforeAll(async () => {
    await IndexedDB.openDatabase();
  });

  test("persists the color field", async () => {
    const id = "color-test-tag";
    await IndexedDB.addTag({ id, name: "Isekai", color: "#FF6347" });

    const saved = await IndexedDB.getTagById(id);
    expect(saved?.color).toBe("#FF6347");
  });

  test("defaults owner to USER and generates a code from the name when not provided", async () => {
    const id = "owner-test-tag";
    await IndexedDB.addTag({ id, name: "Hello World" });

    const saved = await IndexedDB.getTagById(id);
    expect(saved?.owner).toBe("USER");
    expect(saved?.code).toBe("HELLO_WORLD");
  });

  test("preserves an explicitly provided owner and code", async () => {
    const id = "anilist-owned-tag";
    await IndexedDB.addTag({ id, name: "Shounen", code: "SHOUNEN_CUSTOM", owner: "INTEGRATION_ANILIST" });

    const saved = await IndexedDB.getTagById(id);
    expect(saved?.owner).toBe("INTEGRATION_ANILIST");
    expect(saved?.code).toBe("SHOUNEN_CUSTOM");
  });
});

describe("soft delete", () => {
  test("deleteTagById marks deleted_at instead of removing the row, and getAllTags excludes it", async () => {
    const id = "soft-delete-tag";
    await IndexedDB.addTag({ id, name: "ToDelete" });
    await IndexedDB.deleteTagById(id);

    const direct = await IndexedDB.getTagById(id);
    expect(direct).toBeUndefined();

    const all = await IndexedDB.getAllTags();
    expect(all.find((t) => t.id === id)).toBeUndefined();
  });

  test("sync cursor defaults to 0 and round-trips through set/get", async () => {
    expect(await IndexedDB.getLastSyncedAt()).toBe(0);
    await IndexedDB.setLastSyncedAt(1700000000000);
    expect(await IndexedDB.getLastSyncedAt()).toBe(1700000000000);
  });

  test("getVideosByPagination excludes soft-deleted videos and does not skew totalPages", async () => {
    const baselineCount = (await IndexedDB.getAllVideos()).length;

    const keepId = "pagination-keep-video";
    const deleteId = "pagination-delete-video";
    const now = Date.now();

    await IndexedDB.addVideo({
      id: keepId,
      video_title: "Keep",
      video_duration: 100,
      video_url: "https://example.com/keep",
      origin: SiteKey.YOUTUBE,
      created_at: now,
    });
    await IndexedDB.addVideo({
      id: deleteId,
      video_title: "Delete",
      video_duration: 100,
      video_url: "https://example.com/delete",
      origin: SiteKey.YOUTUBE,
      created_at: now + 1,
    });

    await IndexedDB.deleteVideoById(deleteId);

    // pageSize sized to hold exactly baseline + the one surviving video;
    // if the soft-deleted row were still counted, totalPages would be 2 instead of 1.
    const pageSize = baselineCount + 1;
    const paginated = await IndexedDB.getVideosByPagination(0, pageSize);

    expect(paginated.results.find((v) => v.id === deleteId)).toBeUndefined();
    expect(paginated.results.find((v) => v.id === keepId)).toBeDefined();
    expect(paginated.totalPages).toBe(1);
  });
});
