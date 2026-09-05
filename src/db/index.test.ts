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
