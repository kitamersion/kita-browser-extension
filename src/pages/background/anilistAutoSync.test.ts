import { attemptAnilistAutoSync } from "./anilistAutoSync";
import IndexedDB from "@/db/index";
import { getAnilistAuth } from "@/api/integration/anilist";
import { getPendingAnilistSyncs } from "@/api/integration/anilistPendingSync";
import { getSourceAutoSyncConfig } from "@/api/sourceTracking";
import { seriesMappingStorage } from "@/api/seriesMapping";
import { SiteKey } from "@/types/video";
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

jest.mock("@/api/integration/anilist", () => ({
  getAnilistAuth: jest.fn(),
}));

jest.mock("@/api/integration/anilistPendingSync", () => ({
  getPendingAnilistSyncs: jest.fn(),
  addPendingAnilistSync: jest.fn(),
  refreshAnilistPendingBadge: jest.fn(),
}));

jest.mock("@/api/sourceTracking", () => ({
  getSourceAutoSyncConfig: jest.fn(),
}));

jest.mock("@/api/seriesMapping", () => ({
  seriesMappingStorage: {
    findMapping: jest.fn(),
    extendMappingTTL: jest.fn(),
    createMapping: jest.fn(),
  },
}));

const mockGetAniListCache = IndexedDB.getAniListCache as jest.Mock;
const mockSetAniListCache = IndexedDB.setAniListCache as jest.Mock;
const mockGetTagByCode = IndexedDB.getTagByCode as jest.Mock;
const mockUpdateVideoById = IndexedDB.updateVideoById as jest.Mock;

const mockGetAnilistAuth = getAnilistAuth as jest.Mock;
const mockGetPendingAnilistSyncs = getPendingAnilistSyncs as jest.Mock;
const mockGetSourceAutoSyncConfig = getSourceAutoSyncConfig as jest.Mock;
const mockFindMapping = seriesMappingStorage.findMapping as jest.Mock;
const mockExtendMappingTTL = seriesMappingStorage.extendMappingTTL as jest.Mock;

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

const buildVideo = (overrides: Record<string, unknown> = {}) => ({
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

describe("attemptAnilistAutoSync progress reconciliation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    mockGetSourceAutoSyncConfig.mockResolvedValue({ enabled: true });
    mockGetAnilistAuth.mockImplementation((cb) => cb({ access_token: "token-123" }));
    mockGetPendingAnilistSyncs.mockResolvedValue([]);
    mockFindMapping.mockResolvedValue(buildMapping());
    mockExtendMappingTTL.mockResolvedValue(undefined);
    mockGetTagByCode.mockResolvedValue({ id: "tag-anilist" });
    mockUpdateVideoById.mockResolvedValue(undefined);
  });

  test("advances one past AniList's existing progress when it is ahead of kita's local count, and caches it", async () => {
    // A fresh capture behind AniList's progress means the source's on-page numbering doesn't match
    // AniList's cumulative count (e.g. a season/arc reset) - not that the user rewound - so the
    // correct move is to advance past AniList's last known value, not get stuck repeating it.
    mockGetAniListCache.mockResolvedValue(undefined);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { Media: { mediaListEntry: { progress: 10 } } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }),
      });

    await attemptAnilistAutoSync(buildVideo({ watching_episode_number: 1 }));

    const syncCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(syncCallBody.variables).toMatchObject({ mediaId: 813, progress: 11, status: "CURRENT" });
    expect(mockSetAniListCache).toHaveBeenCalledWith("mediaListEntryProgress:813", 11, 6 * 60 * 60 * 1000);
    expect(mockUpdateVideoById).toHaveBeenCalledWith(expect.objectContaining({ watching_episode_number: 11 }));
  });

  test("clamps advanced progress to the media's total episode count", async () => {
    mockGetAniListCache.mockResolvedValue(undefined);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { Media: { mediaListEntry: { progress: 291 } } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }),
      });

    await attemptAnilistAutoSync(buildVideo({ watching_episode_number: 1 }));

    const syncCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(syncCallBody.variables).toMatchObject({ mediaId: 813, progress: 291, status: "COMPLETED" });
  });

  test("still advances from AniList's cached progress even when kita's local count is larger", async () => {
    // AniList is the source of truth once it has a value - kita's local count (season/arc-relative
    // on Crunchyroll) never overrides it just for being numerically bigger.
    mockGetAniListCache.mockResolvedValue(3);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }),
    });

    await attemptAnilistAutoSync(buildVideo({ watching_episode_number: 12 }));

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const syncCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(syncCallBody.variables).toMatchObject({ mediaId: 813, progress: 4, status: "CURRENT" });
    expect(mockUpdateVideoById).toHaveBeenCalledWith(expect.objectContaining({ watching_episode_number: 4 }));
  });

  test("falls back to kita's local count when the AniList progress lookup fails", async () => {
    mockGetAniListCache.mockResolvedValue(undefined);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, statusText: "rate limited", json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { SaveMediaListEntry: { id: 1 } } }),
      });

    await attemptAnilistAutoSync(buildVideo({ watching_episode_number: 5 }));

    const syncCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(syncCallBody.variables).toMatchObject({ mediaId: 813, progress: 5 });
    expect(mockSetAniListCache).toHaveBeenCalledWith("mediaListEntryProgress:813", 5, 6 * 60 * 60 * 1000);
  });
});
