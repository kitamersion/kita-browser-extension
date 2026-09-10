import IndexedDB from "./index";
import { IVideo, SiteKey } from "@/types/video";
import { IVideoTag } from "@/types/relationship";
import { DB_NAME, OBJECT_STORE_VIDEO_TAGS } from "./schema";

// Reads a row directly from the underlying store, bypassing the deleted_at read-filter,
// so tests can assert a row was tombstoned (soft-deleted) rather than physically removed.
function getRawVideoTag(id: string): Promise<IVideoTag | undefined> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(OBJECT_STORE_VIDEO_TAGS, "readonly");
      const store = transaction.objectStore(OBJECT_STORE_VIDEO_TAGS);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result);
      };
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
    request.onerror = () => reject(request.error);
  });
}

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

  test("getTagByCode excludes a soft-deleted tag", async () => {
    const id = "soft-delete-tag-by-code";
    await IndexedDB.addTag({ id, name: "ByCode", code: "BY_CODE_TAG" });
    await IndexedDB.deleteTagById(id);

    const found = await IndexedDB.getTagByCode("BY_CODE_TAG");
    expect(found).toBeUndefined();
  });

  test("getAutoTagByOrigin excludes a soft-deleted auto tag config", async () => {
    const id = "soft-delete-autotag";
    await IndexedDB.addAutoTag({ id, origin: SiteKey.CRUNCHYROLL, tags: ["tag-1"] });
    await IndexedDB.deleteAutoTagById(id);

    const found = await IndexedDB.getAutoTagByOrigin(SiteKey.CRUNCHYROLL);
    expect(found).toBeUndefined();
  });

  test("deleteAllVideoTags soft-deletes every relationship row instead of clearing the store", async () => {
    const videoTagOne: IVideoTag = { id: "vt-soft-delete-1", video_id: "v-soft-delete-1", tag_id: "t-soft-delete-1" };
    const videoTagTwo: IVideoTag = { id: "vt-soft-delete-2", video_id: "v-soft-delete-2", tag_id: "t-soft-delete-2" };
    await IndexedDB.addVideoTag(videoTagOne);
    await IndexedDB.addVideoTag(videoTagTwo);

    await IndexedDB.deleteAllVideoTags();

    const all = await IndexedDB.getAllVideoTags();
    expect(all.find((vt) => vt.id === videoTagOne.id)).toBeUndefined();
    expect(all.find((vt) => vt.id === videoTagTwo.id)).toBeUndefined();

    // Rows must still physically exist (tombstoned), not be wiped by .clear(), so sync can see the deletion.
    const rawOne = await getRawVideoTag(videoTagOne.id);
    const rawTwo = await getRawVideoTag(videoTagTwo.id);
    expect(rawOne).toBeDefined();
    expect(rawOne?.deleted_at).toBeDefined();
    expect(rawTwo).toBeDefined();
    expect(rawTwo?.deleted_at).toBeDefined();
  });
});

describe("replaceAll* write-back", () => {
  test("replaceAllTags replaces the full tags table with exactly the given rows", async () => {
    await IndexedDB.addTag({ id: "old-tag", name: "Old" });

    await IndexedDB.replaceAllTags([{ id: "new-tag", name: "New", updated_at: 1 }]);

    const all = await IndexedDB.getAllTags();
    expect(all.map((t) => t.id)).toEqual(["new-tag"]);
  });

  test("replaceAllVideoTags replaces the full video_tags table with exactly the given rows", async () => {
    await IndexedDB.addVideoTag({ id: "old-vt", video_id: "v1", tag_id: "t1" });

    await IndexedDB.replaceAllVideoTags([{ id: "new-vt", video_id: "v2", tag_id: "t2", updated_at: 1 }]);

    const all = await IndexedDB.getAllVideoTags();
    expect(all.map((vt) => vt.id)).toEqual(["new-vt"]);
  });

  test("replaceAllTags rejects instead of hanging when the database isn't initialized", async () => {
    const uninitialized = new (IndexedDB.constructor as any)();
    await expect(uninitialized.replaceAllTags([])).rejects.toThrow("Database not initialized");
  });
});

describe("rekeyAccountData", () => {
  test("atomically replaces all four synced stores and resets the sync cursor in one call", async () => {
    await IndexedDB.addTag({ id: "pre-rekey-tag", name: "Old" });
    await IndexedDB.addVideoTag({ id: "pre-rekey-vt", video_id: "old-video", tag_id: "old-tag" });
    await IndexedDB.setLastSyncedAt(1700000000000);

    await IndexedDB.rekeyAccountData(
      [{ id: "new-tag", name: "New", updated_at: 1 }],
      [
        {
          id: "new-video",
          video_title: "New Video",
          video_duration: 100,
          video_url: "https://example.com/new",
          origin: SiteKey.YOUTUBE,
          created_at: 1,
          updated_at: 1,
        },
      ],
      [{ id: "new-vt", video_id: "new-video", tag_id: "new-tag", updated_at: 1 }],
      [{ id: "new-autotag", origin: SiteKey.YOUTUBE, tags: ["new-tag"], updated_at: 1 }]
    );

    expect((await IndexedDB.getAllTags()).map((t) => t.id)).toEqual(["new-tag"]);
    expect((await IndexedDB.getAllVideos()).map((v) => v.id)).toEqual(["new-video"]);
    expect((await IndexedDB.getAllVideoTags()).map((vt) => vt.id)).toEqual(["new-vt"]);
    expect((await IndexedDB.getAllAutoTags()).map((a) => a.id)).toEqual(["new-autotag"]);
    expect(await IndexedDB.getLastSyncedAt()).toBe(0);
  });

  test("rejects instead of hanging when the database isn't initialized", async () => {
    const uninitialized = new (IndexedDB.constructor as any)();
    await expect(uninitialized.rekeyAccountData([], [], [], [])).rejects.toThrow("Database not initialized");
  });
});

describe("updated_at stamping", () => {
  // The sync push filter is `row.updated_at > cursor`, and `undefined > n` is false — an unstamped
  // row would never be pushed at all, so the DB layer stamps it rather than trusting callers.
  test("addTag stamps a numeric updated_at", async () => {
    const id = "stamped-tag";
    await IndexedDB.addTag({ id, name: "StampedTag" });

    const saved = await IndexedDB.getTagById(id);
    expect(typeof saved?.updated_at).toBe("number");
  });

  test("addTag stamps updated_at even when the caller passes a stale one", async () => {
    const id = "stale-stamped-tag";
    await IndexedDB.addTag({ id, name: "StaleStampedTag", updated_at: 1 });

    const saved = await IndexedDB.getTagById(id);
    expect(saved?.updated_at).toBeGreaterThan(1);
  });

  test("addVideo stamps a numeric updated_at", async () => {
    const id = "stamped-video";
    await IndexedDB.addVideo({
      id,
      video_title: "Stamped",
      video_duration: 100,
      video_url: "https://example.com/stamped",
      origin: SiteKey.YOUTUBE,
      created_at: Date.now(),
      unique_code: "STAMPED_VIDEO",
    });

    const saved = await IndexedDB.getVideoById(id);
    expect(typeof saved?.updated_at).toBe("number");
  });

  test("addVideoTag stamps a numeric updated_at", async () => {
    const id = "stamped-vt";
    await IndexedDB.addVideoTag({ id, video_id: "v-stamped", tag_id: "t-stamped" });

    const saved = await getRawVideoTag(id);
    expect(typeof saved?.updated_at).toBe("number");
  });

  test("addAutoTag stamps a numeric updated_at", async () => {
    const id = "stamped-autotag";
    await IndexedDB.addAutoTag({ id, origin: SiteKey.YOUTUBE_MUSIC, tags: ["tag-1"] });

    const all = await IndexedDB.getAllAutoTags();
    expect(typeof all.find((a) => a.id === id)?.updated_at).toBe("number");
  });

  test("updateTagById refreshes updated_at", async () => {
    const id = "updated-tag";
    await IndexedDB.addTag({ id, name: "UpdatedTag" });
    const created = await IndexedDB.getTagById(id);

    await IndexedDB.updateTagById({ ...(created as any), name: "UpdatedTagRenamed", updated_at: 1 });

    const saved = await IndexedDB.getTagById(id);
    expect(saved?.name).toBe("UpdatedTagRenamed");
    expect(saved?.updated_at).toBeGreaterThanOrEqual(created?.updated_at as number);
    expect(saved?.updated_at).toBeGreaterThan(1);
  });

  test("updateVideoById refreshes updated_at", async () => {
    const id = "updated-video";
    await IndexedDB.addVideo({
      id,
      video_title: "BeforeUpdate",
      video_duration: 100,
      video_url: "https://example.com/updated",
      origin: SiteKey.YOUTUBE,
      created_at: Date.now(),
      unique_code: "UPDATED_VIDEO",
    });
    const created = await IndexedDB.getVideoById(id);

    await IndexedDB.updateVideoById({ ...(created as IVideo), video_title: "AfterUpdate", updated_at: 1 });

    const saved = await IndexedDB.getVideoById(id);
    expect(saved?.video_title).toBe("AfterUpdate");
    expect(saved?.updated_at).toBeGreaterThanOrEqual(created?.updated_at as number);
    expect(saved?.updated_at).toBeGreaterThan(1);
  });
});

describe("soft delete frees the unique natural-key indexes", () => {
  // tags.code and videos.unique_code are `unique: true` IndexedDB indexes. A tombstone that kept
  // its natural key would make re-creating the same entity fail with a ConstraintError.
  test("a tag can be re-created under the same name after the original was soft-deleted", async () => {
    await IndexedDB.addTag({ id: "anime-tag-original", name: "Anime" });
    await IndexedDB.deleteTagById("anime-tag-original");

    await expect(IndexedDB.addTag({ id: "anime-tag-recreated", name: "Anime" })).resolves.toBeUndefined();

    const recreated = await IndexedDB.getTagByCode("ANIME");
    expect(recreated?.id).toBe("anime-tag-recreated");
  });

  test("a video can be re-created under the same unique_code after the original was soft-deleted", async () => {
    const video = {
      video_title: "Same Title",
      video_duration: 100,
      video_url: "https://example.com/same",
      origin: SiteKey.YOUTUBE,
      created_at: Date.now(),
      unique_code: "SAME_UNIQUE_CODE",
    };
    await IndexedDB.addVideo({ ...video, id: "same-code-original" });
    await IndexedDB.deleteVideoById("same-code-original");

    await expect(IndexedDB.addVideo({ ...video, id: "same-code-recreated" })).resolves.toBeUndefined();

    const recreated = await IndexedDB.getVideoByUniqueCode("SAME_UNIQUE_CODE");
    expect(recreated?.id).toBe("same-code-recreated");
  });
});

describe("tombstones never shadow a live row on an indexed lookup", () => {
  test("getAutoTagByOrigin returns the live row even when a tombstone sorts ahead of it", async () => {
    // `auto_tags.origin` is a non-unique index, so both rows coexist under the same key. Ids are
    // chosen so the tombstone sorts first by primary key — which is exactly what index.get() would
    // have returned, silently disabling auto-tagging for this origin.
    const origin = SiteKey.CRUNCHYROLL;
    await IndexedDB.addAutoTag({ id: "aaa-autotag-tombstone", origin, tags: ["old-tag"] });
    await IndexedDB.addAutoTag({ id: "zzz-autotag-live", origin, tags: ["new-tag"] });
    await IndexedDB.deleteAutoTagById("aaa-autotag-tombstone");

    const found = await IndexedDB.getAutoTagByOrigin(origin);
    expect(found?.id).toBe("zzz-autotag-live");
    expect(found?.tags).toEqual(["new-tag"]);
  });
});

describe("getAllX includeDeleted parameter", () => {
  test("getAllTags excludes soft-deleted tags by default and includes them when includeDeleted is true", async () => {
    const id = "include-deleted-tag";
    await IndexedDB.addTag({ id, name: "IncludeDeletedTag" });
    await IndexedDB.deleteTagById(id);

    const defaultResult = await IndexedDB.getAllTags();
    expect(defaultResult.find((t) => t.id === id)).toBeUndefined();

    const withDeleted = await IndexedDB.getAllTags(true);
    expect(withDeleted.find((t) => t.id === id)).toBeDefined();
  });

  test("getAllVideos excludes soft-deleted videos by default and includes them when includeDeleted is true", async () => {
    const id = "include-deleted-video";
    await IndexedDB.addVideo({
      id,
      video_title: "IncludeDeletedVideo",
      video_duration: 100,
      video_url: "https://example.com/include-deleted",
      origin: SiteKey.YOUTUBE,
      created_at: Date.now(),
    });
    await IndexedDB.deleteVideoById(id);

    const defaultResult = await IndexedDB.getAllVideos();
    expect(defaultResult.find((v) => v.id === id)).toBeUndefined();

    const withDeleted = await IndexedDB.getAllVideos(true);
    expect(withDeleted.find((v) => v.id === id)).toBeDefined();
  });

  test("deleteVideoTagByVideoAndTagId only removes the relationship for that specific video, not every video sharing the tag", async () => {
    await IndexedDB.addVideoTag({ id: "vt-shared-a", video_id: "video-a", tag_id: "shared-tag" });
    await IndexedDB.addVideoTag({ id: "vt-shared-b", video_id: "video-b", tag_id: "shared-tag" });

    await IndexedDB.deleteVideoTagByVideoAndTagId("video-a", "shared-tag");

    const remaining = await IndexedDB.getAllVideoTags();
    expect(remaining.find((vt) => vt.id === "vt-shared-a")).toBeUndefined();
    expect(remaining.find((vt) => vt.id === "vt-shared-b")).toBeDefined();
  });

  test("getAllVideoTags excludes soft-deleted relationships by default and includes them when includeDeleted is true", async () => {
    const id = "include-deleted-vt";
    await IndexedDB.addVideoTag({ id, video_id: "v-idt", tag_id: "t-idt" });
    await IndexedDB.deleteVideoTagByVideoId("v-idt");

    const defaultResult = await IndexedDB.getAllVideoTags();
    expect(defaultResult.find((vt) => vt.id === id)).toBeUndefined();

    const withDeleted = await IndexedDB.getAllVideoTags(true);
    expect(withDeleted.find((vt) => vt.id === id)).toBeDefined();
  });

  test("getAllAutoTags excludes soft-deleted auto tags by default and includes them when includeDeleted is true", async () => {
    const id = "include-deleted-autotag";
    await IndexedDB.addAutoTag({ id, origin: SiteKey.CRUNCHYROLL, tags: ["tag-1"] });
    await IndexedDB.deleteAutoTagById(id);

    const defaultResult = await IndexedDB.getAllAutoTags();
    expect(defaultResult.find((a) => a.id === id)).toBeUndefined();

    const withDeleted = await IndexedDB.getAllAutoTags(true);
    expect(withDeleted.find((a) => a.id === id)).toBeDefined();
  });
});
