import IndexedDB from "./index";

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
});
