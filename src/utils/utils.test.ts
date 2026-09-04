import { IVideo, SiteKey } from "@/types/video";
import { ISeriesMapping, ISeriesSearchResult } from "@/types/integrations/seriesMapping";
import {
  convertToSeconds,
  decideAnilistAutoSyncAction,
  filterVideos,
  formatDuration,
  formatPendingSeriesSummary,
  formatTimestamp,
  generateUniqueCode,
  getDateFromNow,
  getSettingsTabIndexFromSearch,
  hasReachedWatchThreshold,
  mapSiteKeyToSourcePlatform,
  parseAnilistAuthFromRedirectUrl,
  pickAutoMatch,
  randomOffset,
} from ".";

describe("formatDuration function", () => {
  test.each([
    [30, "0h 0m"],
    [1500, "0h 25m"],
    [3720, "1h 2m"],
    [3600, "1h 0m"],
    [86400, "24h 0m"],
    [93720, "26h 2m"],
  ])("formats %s seconds => %i", (seconds, expected) => {
    expect(formatDuration(seconds)).toEqual(expected);
  });
});

describe("convertToSeconds function", () => {
  test.each([
    ["0 0 30", 30],
    ["0 25 0", 1500],
    ["1 2 0", 3720],
    ["1 0 0", 3600],
    ["24 0 0", 86400],
    ["26 2 0", 93720],
  ])("converts %s to %i seconds", (time, expectedSeconds) => {
    expect(convertToSeconds(time)).toEqual(expectedSeconds);
  });
});

describe("formatTimestamp function", () => {
  test.each([
    [1709958630709, "2024-03-09"],
    [1646402400000, "2022-03-04"],
    [1664371200000, "2022-09-28"],
    [1686105600000, "2023-06-07"],
  ])("should return formatted date from %i to => %s", (timestamp, expectedDate) => {
    const formattedDate = formatTimestamp(timestamp);

    expect(formattedDate).toBe(expectedDate);
  });
});

describe("generateUniqueCode function", () => {
  test("generates unique code for video", () => {
    const video = {
      video_title: "Sample Video",
      origin: "RANDOM_ORIGIN",
    };

    const uniqueCode = generateUniqueCode(video.video_title, video.origin);

    expect(uniqueCode).toBeDefined();
    expect(typeof uniqueCode).toBe("string");
  });
});

describe("formatDuration function", () => {
  test.each([
    [30, "0h 0m"],
    [1500, "0h 25m"],
    [3720, "1h 2m"],
    [3600, "1h 0m"],
    [86400, "24h 0m"],
    [93720, "26h 2m"],
  ])("formats %s seconds => %i", (seconds, expected) => {
    expect(formatDuration(seconds)).toEqual(expected);
  });
});

describe("convertToSeconds function", () => {
  test.each([
    ["0 0 30", 30],
    ["0 25 0", 1500],
    ["1 2 0", 3720],
    ["1 0 0", 3600],
    ["24 0 0", 86400],
    ["26 2 0", 93720],
  ])("converts %s to %i seconds", (time, expectedSeconds) => {
    expect(convertToSeconds(time)).toEqual(expectedSeconds);
  });
});

describe("formatTimestamp function", () => {
  test.each([
    [1709958630709, "2024-03-09"],
    [1646402400000, "2022-03-04"],
    [1664371200000, "2022-09-28"],
    [1686105600000, "2023-06-07"],
  ])("should return formatted date from %i to => %s", (timestamp, expectedDate) => {
    const formattedDate = formatTimestamp(timestamp);

    expect(formattedDate).toBe(expectedDate);
  });
});

describe("generateUniqueCode function", () => {
  test("generates unique code for video", () => {
    const video = {
      video_title: "Sample Video",
      origin: "RANDOM_ORIGIN",
    };

    const uniqueCode = generateUniqueCode(video.video_title, video.origin);

    expect(uniqueCode).toBeDefined();
    expect(typeof uniqueCode).toBe("string");
  });
});

describe("filterVideos function", () => {
  it("returns an empty array when no videos are provided", () => {
    const videos = [] as IVideo[];
    const date = new Date();
    expect(filterVideos(videos, date)).toEqual([]);
  });

  it("returns an empty array when all videos are before the date", () => {
    const videos = [{ created_at: new Date("2022-01-01").getTime() }, { created_at: new Date("2022-01-02").getTime() }] as IVideo[];
    const date = new Date("2022-02-01");
    expect(filterVideos(videos, date)).toEqual([]);
  });

  it("returns only videos after the date when some videos are before and some are after the date", () => {
    const videos = [
      { created_at: new Date("2022-01-01").getTime() },
      { created_at: new Date("2022-02-01").getTime() },
      { created_at: new Date("2022-03-01").getTime() },
    ] as IVideo[];
    const date = new Date("2022-02-01");
    const expected = [{ created_at: new Date("2022-03-01").getTime() }];
    expect(filterVideos(videos, date)).toEqual(expected);
  });

  it("returns all videos when all videos are after the date", () => {
    const videos = [{ created_at: new Date("2022-03-01").getTime() }, { created_at: new Date("2022-04-01").getTime() }] as IVideo[];
    const date = new Date("2022-02-01");
    expect(filterVideos(videos, date)).toEqual(videos);
  });
});

describe("getDateFromNow function", () => {
  test("returns date from specified number of days ago", () => {
    const days = 7;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - days);

    const result = getDateFromNow(days);

    expect(result.getFullYear()).toBe(expectedDate.getFullYear());
    expect(result.getMonth()).toBe(expectedDate.getMonth());
    expect(result.getDate()).toBe(expectedDate.getDate());
  });
});

describe("parseAnilistAuthFromRedirectUrl function", () => {
  test("returns null when the redirect fragment has no access_token", () => {
    const redirectUrl = "https://abc.chromiumapp.org/callback#error=access_denied";
    expect(parseAnilistAuthFromRedirectUrl(redirectUrl)).toBeNull();
  });

  test("defaults expires_in to the 1 year token lifetime when AniList omits it from the fragment", () => {
    // AniList's current implicit grant redirect only includes `access_token` in the fragment.
    const redirectUrl = "https://abc.chromiumapp.org/callback#access_token=sometoken";

    const auth = parseAnilistAuthFromRedirectUrl(redirectUrl);

    expect(auth?.access_token).toBe("sometoken");
    expect(auth?.expires_in).toBe(31536000);
    // regression guard: a falsy/zero expires_in makes the token look expired the instant it's issued
    expect(auth?.expires_in).toBeGreaterThan(0);
  });

  test("uses expires_in and token_type from the fragment when present", () => {
    const redirectUrl = "https://abc.chromiumapp.org/callback#access_token=sometoken&expires_in=1234&token_type=Bearer";

    const auth = parseAnilistAuthFromRedirectUrl(redirectUrl);

    expect(auth).toEqual({
      access_token: "sometoken",
      token_type: "Bearer",
      expires_in: 1234,
      issued_at: expect.any(Number),
    });
  });
});

describe("hasReachedWatchThreshold function", () => {
  test("returns false before the threshold is reached", () => {
    expect(hasReachedWatchThreshold(40, 100, 80)).toBe(false);
  });

  test("returns true once the threshold is reached", () => {
    expect(hasReachedWatchThreshold(80, 100, 80)).toBe(true);
  });

  test("returns true once the threshold is exceeded", () => {
    expect(hasReachedWatchThreshold(95, 100, 80)).toBe(true);
  });

  test.each([0, NaN, -1])("returns false when duration is %p", (duration) => {
    expect(hasReachedWatchThreshold(50, duration, 80)).toBe(false);
  });
});

describe("mapSiteKeyToSourcePlatform function", () => {
  test("maps CRUNCHYROLL to the crunchyroll source platform", () => {
    expect(mapSiteKeyToSourcePlatform(SiteKey.CRUNCHYROLL)).toBe("crunchyroll");
  });

  test("maps YOUTUBE to the youtube source platform", () => {
    expect(mapSiteKeyToSourcePlatform(SiteKey.YOUTUBE)).toBe("youtube");
  });

  test("maps YOUTUBE_MUSIC to the youtube source platform", () => {
    expect(mapSiteKeyToSourcePlatform(SiteKey.YOUTUBE_MUSIC)).toBe("youtube");
  });

  test("returns undefined for an unknown site key", () => {
    expect(mapSiteKeyToSourcePlatform("UNKNOWN" as SiteKey)).toBeUndefined();
  });
});

describe("pickAutoMatch function", () => {
  const result = (id: number, seasonYear?: number): ISeriesSearchResult => ({
    id,
    title: { english: `Result ${id}` },
    seasonYear,
  });

  test("returns undefined when no season year is provided", () => {
    expect(pickAutoMatch([result(1, 2020)], undefined)).toBeUndefined();
  });

  test("returns undefined when no result matches the season year", () => {
    expect(pickAutoMatch([result(1, 2020), result(2, 2021)], 2022)).toBeUndefined();
  });

  test("returns the result matching the season year", () => {
    const match = result(2, 2021);
    expect(pickAutoMatch([result(1, 2020), match], 2021)).toBe(match);
  });

  test("returns undefined for an empty result list", () => {
    expect(pickAutoMatch([], 2021)).toBeUndefined();
  });
});

describe("decideAnilistAutoSyncAction function", () => {
  const existingMapping = { id: "mapping-1", anilist_series_id: 42 } as ISeriesMapping;
  const seasonMatch: ISeriesSearchResult = { id: 1, title: { english: "Dragon Ball Z" }, seasonYear: 1989 };
  const otherResult: ISeriesSearchResult = { id: 2, title: { english: "Dragon Ball Super" }, seasonYear: 2015 };

  const baseParams = {
    autoSyncEnabled: true,
    hasAuthToken: true,
    existingMapping: null as ISeriesMapping | null,
    hasPendingForSeries: false,
    searchResults: null as ISeriesSearchResult[] | null,
    seasonYear: 1989,
  };

  test("skips when auto-sync is disabled for the source", () => {
    expect(decideAnilistAutoSyncAction({ ...baseParams, autoSyncEnabled: false })).toEqual({
      action: "skip",
      reason: "auto-sync disabled for this source",
    });
  });

  test("skips when AniList isn't connected", () => {
    expect(decideAnilistAutoSyncAction({ ...baseParams, hasAuthToken: false })).toEqual({
      action: "skip",
      reason: "anilist not connected",
    });
  });

  test("syncs directly when a mapping already exists", () => {
    expect(decideAnilistAutoSyncAction({ ...baseParams, existingMapping })).toEqual({
      action: "sync",
      mapping: existingMapping,
    });
  });

  test("skips (without searching again) when this series already has a pending review", () => {
    expect(decideAnilistAutoSyncAction({ ...baseParams, hasPendingForSeries: true })).toEqual({
      action: "skip",
      reason: "already queued for review",
    });
  });

  test("skips when there's no mapping and no search results", () => {
    expect(decideAnilistAutoSyncAction({ ...baseParams, searchResults: [] })).toEqual({
      action: "skip",
      reason: "no anilist search results",
    });
  });

  test("creates a mapping and syncs when a season-year match is found", () => {
    expect(decideAnilistAutoSyncAction({ ...baseParams, searchResults: [otherResult, seasonMatch] })).toEqual({
      action: "createMappingAndSync",
      match: seasonMatch,
    });
  });

  test("queues for review when results are ambiguous", () => {
    const results = [otherResult, { ...seasonMatch, seasonYear: 1990 }];
    expect(decideAnilistAutoSyncAction({ ...baseParams, searchResults: results })).toEqual({
      action: "queuePending",
      results,
    });
  });
});

describe("getSettingsTabIndexFromSearch function", () => {
  test("defaults to the first tab when there's no tab query param", () => {
    expect(getSettingsTabIndexFromSearch("")).toBe(0);
  });

  test("resolves a known tab name to its index", () => {
    expect(getSettingsTabIndexFromSearch("?tab=autotrack")).toBe(1);
  });

  test("defaults to the first tab for an unknown tab name", () => {
    expect(getSettingsTabIndexFromSearch("?tab=doesnotexist")).toBe(0);
  });
});

describe("formatPendingSeriesSummary function", () => {
  test("returns an empty string for no titles", () => {
    expect(formatPendingSeriesSummary([])).toBe("");
  });

  test("returns the single title as-is", () => {
    expect(formatPendingSeriesSummary(["Dragon Ball"])).toBe("Dragon Ball");
  });

  test("joins two titles with 'and'", () => {
    expect(formatPendingSeriesSummary(["Dragon Ball", "One Piece"])).toBe("Dragon Ball and One Piece");
  });

  test("joins up to the max shown with commas", () => {
    expect(formatPendingSeriesSummary(["Dragon Ball", "One Piece", "Naruto"])).toBe("Dragon Ball, One Piece, and Naruto");
  });

  test("truncates beyond the max shown and appends a count of the rest", () => {
    expect(formatPendingSeriesSummary(["Dragon Ball", "One Piece", "Naruto", "Bleach"])).toBe("Dragon Ball, One Piece, and 2 more");
  });

  test("respects a custom maxShown", () => {
    expect(formatPendingSeriesSummary(["Dragon Ball", "One Piece", "Naruto"], 1)).toBe("Dragon Ball and 2 more");
  });
});

describe.skip("randomOffset function", () => {
  it("should return a number", () => {
    const result = randomOffset();
    expect(typeof result).toBe("number");
  });

  it("should return a number less than max", () => {
    const max = 500;
    const result = randomOffset(max);
    expect(result).toBeLessThan(max);
  });

  it("should return a whole number", () => {
    const result = randomOffset();
    expect(Number.isInteger(result)).toBe(true);
  });

  it("should return a number less than 1000 when no argument is passed", () => {
    const result = randomOffset();
    expect(result).toBeLessThan(1000);
  });
});
