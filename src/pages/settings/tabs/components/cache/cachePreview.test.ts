import { getCachePreview } from "./cachePreview";

describe("getCachePreview", () => {
  test("profile: shows the viewer's name and avatar", () => {
    const preview = getCachePreview("profile", "profile", { name: "Ada", avatar: { medium: "https://x/a.png" } });
    expect(preview).toEqual({ title: "Ada", subtitle: "AniList profile", imageUrl: "https://x/a.png" });
  });

  test("profile: falls back to the key when the name is missing", () => {
    expect(getCachePreview("profile", "profile", {}).title).toBe("profile");
  });

  test("lists: shows the status parsed from the key and a total entry count", () => {
    const value = {
      MediaListCollection: {
        lists: [{ entries: [{}, {}] }, { entries: [{}] }],
      },
    };
    const preview = getCachePreview("lists", "list:42:CURRENT", value);
    expect(preview).toEqual({ title: "CURRENT list", subtitle: "3 entries" });
  });

  test("collections: shows genre count for genreCollection", () => {
    const preview = getCachePreview("collections", "genreCollection", ["Action", "Comedy"]);
    expect(preview).toEqual({ title: "Genre collection", subtitle: "2 genres" });
  });

  test("collections: shows tag count for tagCollection", () => {
    const preview = getCachePreview("collections", "tagCollection", [{ value: "Isekai" }]);
    expect(preview).toEqual({ title: "Tag collection", subtitle: "1 tags" });
  });

  test("search: shows the key's hash as the title, labeled as a hashed search, with the first result's cover and the total result count", () => {
    const value = {
      media: [{ title: { userPreferred: "Frieren" }, coverImage: { large: "https://x/f.png" } }],
      pageInfo: { total: 57 },
    };
    const preview = getCachePreview("search", "search:abc123", value);
    expect(preview).toEqual({ title: "abc123", subtitle: "Hashed search query · 57 results", imageUrl: "https://x/f.png" });
  });

  test("search: falls back to the raw key as the title when it has no 'search:' prefix", () => {
    const preview = getCachePreview("search", "abc123", { media: [], pageInfo: { total: 0 } });
    expect(preview.title).toBe("abc123");
  });

  test("other: falls back to the raw key", () => {
    expect(getCachePreview("other", "mystery-key", {})).toEqual({ title: "mystery-key" });
  });
});
