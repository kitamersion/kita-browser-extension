import { syncEpisodeToAnilist } from "./anilistEpisodeSync";
import IndexedDB from "@/db/index";
import { IVideo, SiteKey } from "@/types/video";
import { ISeriesMapping } from "@/types/integrations/seriesMapping";

jest.mock("@/db/index", () => ({
  __esModule: true,
  default: {
    getAniListCache: jest.fn(),
    setAniListCache: jest.fn(),
    getTagByCode: jest.fn(),
    updateVideoById: jest.fn(),
    addVideoTag: jest.fn(),
  },
}));

const mockGetAniListCache = IndexedDB.getAniListCache as jest.Mock;
const mockSetAniListCache = IndexedDB.setAniListCache as jest.Mock;
const mockGetTagByCode = IndexedDB.getTagByCode as jest.Mock;
const mockUpdateVideoById = IndexedDB.updateVideoById as jest.Mock;
const mockAddVideoTag = IndexedDB.addVideoTag as jest.Mock;

const buildMapping = (overrides: Partial<ISeriesMapping> = {}): ISeriesMapping => ({
  id: "mapping-1",
  series_title: "Dragon Ball Z",
  normalized_title: "dragon ball z",
  source_platform: "crunchyroll",
  anilist_series_id: 813,
  total_episodes: 291,
  created_at: 0,
  updated_at: 0,
  expires_at: 0,
  user_confirmed: true,
  ...overrides,
});

const buildVideo = (overrides: Partial<IVideo> = {}): IVideo => ({
  id: "video-1",
  video_title: "Dragon Ball Z Episode 1",
  video_duration: 1000,
  video_url: "https://crunchyroll.com/watch/1",
  origin: SiteKey.CRUNCHYROLL,
  created_at: Date.now(),
  series_title: "Dragon Ball Z",
  watching_episode_number: 1,
  ...overrides,
});

describe("syncEpisodeToAnilist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockGetTagByCode.mockResolvedValue({ id: "tag-anilist" });
    mockUpdateVideoById.mockResolvedValue(undefined);
    mockAddVideoTag.mockResolvedValue(undefined);
  });

  test("skips when the mapping has no anilist_series_id", async () => {
    const result = await syncEpisodeToAnilist(buildVideo(), buildMapping({ anilist_series_id: undefined }), "token-123");
    expect(result).toEqual({ status: "skipped", reason: "mapping has no anilist_series_id" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("skips when the video has no watching_episode_number", async () => {
    const result = await syncEpisodeToAnilist(buildVideo({ watching_episode_number: undefined }), buildMapping(), "token-123");
    expect(result).toEqual({ status: "skipped", reason: "video has no watching_episode_number" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("advances one past AniList's known progress, caches it, and writes the video back", async () => {
    mockGetAniListCache.mockResolvedValue(undefined);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { Media: { mediaListEntry: { progress: 10 } } } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }) });

    const result = await syncEpisodeToAnilist(buildVideo({ watching_episode_number: 1 }), buildMapping(), "token-123");

    expect(result).toMatchObject({ status: "synced", progress: 11 });
    const syncCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(syncCallBody.variables).toMatchObject({ mediaId: 813, progress: 11, status: "CURRENT" });
    expect(mockSetAniListCache).toHaveBeenCalledWith("mediaListEntryProgress:813", 11, 6 * 60 * 60 * 1000);
    expect(mockUpdateVideoById).toHaveBeenCalledWith(expect.objectContaining({ watching_episode_number: 11, anilist_series_id: 813 }));
  });

  test("does not advance when the local count already matches AniList's known progress", async () => {
    mockGetAniListCache.mockResolvedValue(170);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }) });

    const result = await syncEpisodeToAnilist(buildVideo({ watching_episode_number: 170 }), buildMapping(), "token-123");

    expect(result).toMatchObject({ status: "synced", progress: 170 });
  });

  test("uses the cached progress on a second call instead of refetching", async () => {
    mockGetAniListCache.mockResolvedValue(50);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }) });

    await syncEpisodeToAnilist(buildVideo({ id: "video-1", watching_episode_number: 1 }), buildMapping(), "token-123");
    expect(global.fetch).toHaveBeenCalledTimes(1);

    mockGetAniListCache.mockResolvedValue(51);
    await syncEpisodeToAnilist(buildVideo({ id: "video-2", watching_episode_number: 2 }), buildMapping(), "token-123");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("sets status COMPLETED and clamps progress when it reaches the total episode count", async () => {
    mockGetAniListCache.mockResolvedValue(290);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }) });

    const result = await syncEpisodeToAnilist(
      buildVideo({ watching_episode_number: 1 }),
      buildMapping({ total_episodes: 291 }),
      "token-123"
    );

    expect(result).toMatchObject({ status: "synced", progress: 291 });
    const syncCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(syncCallBody.variables).toMatchObject({ progress: 291, status: "COMPLETED" });
  });

  test("links the ANILIST tag when it exists locally", async () => {
    mockGetAniListCache.mockResolvedValue(0);
    mockGetTagByCode.mockResolvedValue({ id: "tag-anilist" });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }) });

    const result = await syncEpisodeToAnilist(buildVideo(), buildMapping(), "token-123");

    expect(mockAddVideoTag).toHaveBeenCalledWith(expect.objectContaining({ video_id: "video-1", tag_id: "tag-anilist" }));
    expect(mockUpdateVideoById).toHaveBeenCalledWith(expect.objectContaining({ tags: ["tag-anilist"] }));
    // The returned videoTag must be the exact same object passed to addVideoTag - a caller that
    // re-publishes it (e.g. to refresh an open UI) must not create a second row under a new id.
    expect(result).toMatchObject({ videoTag: { video_id: "video-1", tag_id: "tag-anilist" } });
    expect(mockAddVideoTag.mock.calls[0][0].id).toBe((result as { videoTag?: { id: string } }).videoTag?.id);
  });

  test("does not link a tag or touch the video's tags when the ANILIST tag does not exist locally", async () => {
    mockGetAniListCache.mockResolvedValue(0);
    mockGetTagByCode.mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }) });

    await syncEpisodeToAnilist(buildVideo({ tags: ["existing-tag"] }), buildMapping(), "token-123");

    expect(mockAddVideoTag).not.toHaveBeenCalled();
    expect(mockUpdateVideoById).toHaveBeenCalledWith(expect.objectContaining({ tags: ["existing-tag"] }));
  });

  test("falls back to the local count when the AniList progress lookup fails", async () => {
    mockGetAniListCache.mockResolvedValue(undefined);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, statusText: "rate limited", json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }) });

    const result = await syncEpisodeToAnilist(buildVideo({ watching_episode_number: 5 }), buildMapping(), "token-123");

    expect(result).toMatchObject({ status: "synced", progress: 5 });
    expect(mockSetAniListCache).toHaveBeenCalledWith("mediaListEntryProgress:813", 5, 6 * 60 * 60 * 1000);
  });

  test("returns an error result instead of throwing when the push to AniList fails", async () => {
    mockGetAniListCache.mockResolvedValue(0);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, statusText: "server error", json: async () => ({}) });

    const result = await syncEpisodeToAnilist(buildVideo({ watching_episode_number: 1 }), buildMapping(), "token-123");

    expect(result.status).toBe("error");
    expect(mockUpdateVideoById).not.toHaveBeenCalled();
  });
});
