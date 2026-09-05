import { SETTINGS_GROUPS, getVisibleItems } from "./settingsNav";

describe("SETTINGS_GROUPS", () => {
  test("groups appear in the expected order", () => {
    expect(SETTINGS_GROUPS.map((group) => group.id)).toEqual(["track", "organize", "data", "advanced"]);
  });

  test("the track group contains integration, autotrack, and anilist items in order", () => {
    const track = SETTINGS_GROUPS.find((group) => group.id === "track")!;
    expect(track.items.map((item) => item.id)).toEqual(["integration", "autotrack", "anilist"]);
  });

  test("the organize group contains tags and mappings", () => {
    const organize = SETTINGS_GROUPS.find((group) => group.id === "organize")!;
    expect(organize.items.map((item) => item.id)).toEqual(["tags", "mappings"]);
  });

  test("the data group contains general", () => {
    const data = SETTINGS_GROUPS.find((group) => group.id === "data")!;
    expect(data.items.map((item) => item.id)).toEqual(["general"]);
  });

  test("the advanced group contains logs", () => {
    const advanced = SETTINGS_GROUPS.find((group) => group.id === "advanced")!;
    expect(advanced.items.map((item) => item.id)).toEqual(["logs"]);
  });
});

describe("getVisibleItems", () => {
  test("excludes the anilist item when unauthorized", () => {
    const ids = getVisibleItems(SETTINGS_GROUPS, { anilistAuthStatus: "unauthorized" }).map((item) => item.id);
    expect(ids).toEqual(["integration", "autotrack", "tags", "mappings", "general", "logs"]);
  });

  test("includes the anilist item when authorized", () => {
    const ids = getVisibleItems(SETTINGS_GROUPS, { anilistAuthStatus: "authorized" }).map((item) => item.id);
    expect(ids).toContain("anilist");
  });
});
