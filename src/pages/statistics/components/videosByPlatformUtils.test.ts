import { buildPlatformBreakdown } from "./videosByPlatformUtils";
import { IVideo, SiteKey } from "@/types/video";

const makeVideo = (id: string, origin: SiteKey): IVideo => ({
  id,
  video_title: "Video",
  video_duration: 100,
  video_url: "https://example.com",
  origin,
  created_at: Date.now(),
});

describe("buildPlatformBreakdown", () => {
  test("returns an empty array for no videos", () => {
    expect(buildPlatformBreakdown([])).toEqual([]);
  });

  test("counts videos per origin and sorts busiest first", () => {
    const videos = [
      makeVideo("1", SiteKey.YOUTUBE),
      makeVideo("2", SiteKey.CRUNCHYROLL),
      makeVideo("3", SiteKey.YOUTUBE),
      makeVideo("4", SiteKey.YOUTUBE),
    ];

    const result = buildPlatformBreakdown(videos);

    expect(result).toEqual([
      { origin: SiteKey.YOUTUBE, count: 3, percentage: 100 },
      { origin: SiteKey.CRUNCHYROLL, count: 1, percentage: (1 / 3) * 100 },
    ]);
  });

  test("only includes platforms actually present in the data", () => {
    const result = buildPlatformBreakdown([makeVideo("1", SiteKey.CRUNCHYROLL)]);

    expect(result).toEqual([{ origin: SiteKey.CRUNCHYROLL, count: 1, percentage: 100 }]);
  });
});
