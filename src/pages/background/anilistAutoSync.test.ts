import { attemptAnilistAutoSync } from "./anilistAutoSync";
import { getAnilistAuth } from "@/api/integration/anilist";
import { getPendingAnilistSyncs, addPendingAnilistSync, refreshAnilistPendingBadge } from "@/api/integration/anilistPendingSync";
import { getSourceAutoSyncConfig } from "@/api/sourceTracking";
import { seriesMappingStorage } from "@/api/seriesMapping";
import { syncEpisodeToAnilist } from "@/api/integration/anilistEpisodeSync";
import { SiteKey } from "@/types/video";
import { ISeriesMapping } from "@/types/integrations/seriesMapping";

// This suite only covers attemptAnilistAutoSync's *routing* - which of the four decision branches
// fires, and what it hands off to syncEpisodeToAnilist/seriesMappingStorage/pendingSync. The actual
// progress reconciliation (advance/clamp/rewatch-equality) is exercised once, in
// anilistEpisodeSync.test.ts, rather than re-verified here against a mocked fetch.
jest.mock("@/api/integration/anilistEpisodeSync", () => ({
  ...jest.requireActual("@/api/integration/anilistEpisodeSync"),
  syncEpisodeToAnilist: jest.fn(),
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

const mockGetAnilistAuth = getAnilistAuth as jest.Mock;
const mockGetPendingAnilistSyncs = getPendingAnilistSyncs as jest.Mock;
const mockAddPendingAnilistSync = addPendingAnilistSync as jest.Mock;
const mockRefreshAnilistPendingBadge = refreshAnilistPendingBadge as jest.Mock;
const mockGetSourceAutoSyncConfig = getSourceAutoSyncConfig as jest.Mock;
const mockFindMapping = seriesMappingStorage.findMapping as jest.Mock;
const mockExtendMappingTTL = seriesMappingStorage.extendMappingTTL as jest.Mock;
const mockCreateMapping = seriesMappingStorage.createMapping as jest.Mock;
const mockSyncEpisodeToAnilist = syncEpisodeToAnilist as jest.Mock;

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

describe("attemptAnilistAutoSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockGetSourceAutoSyncConfig.mockResolvedValue({ enabled: true });
    mockGetAnilistAuth.mockImplementation((cb) => cb({ access_token: "token-123" }));
    mockGetPendingAnilistSyncs.mockResolvedValue([]);
    mockExtendMappingTTL.mockResolvedValue(undefined);
    mockSyncEpisodeToAnilist.mockResolvedValue({ status: "synced", progress: 1 });
  });

  test("skips entirely when there is no series title", async () => {
    await attemptAnilistAutoSync(buildVideo({ series_title: undefined }));
    expect(mockGetSourceAutoSyncConfig).not.toHaveBeenCalled();
  });

  test("skips when auto-sync is disabled for the source", async () => {
    mockGetSourceAutoSyncConfig.mockResolvedValue({ enabled: false });
    mockFindMapping.mockResolvedValue(null);

    await attemptAnilistAutoSync(buildVideo());

    expect(mockSyncEpisodeToAnilist).not.toHaveBeenCalled();
    expect(mockAddPendingAnilistSync).not.toHaveBeenCalled();
  });

  test("syncs directly against an existing mapping and extends its TTL", async () => {
    const mapping = buildMapping();
    mockFindMapping.mockResolvedValue(mapping);

    const video = buildVideo();
    await attemptAnilistAutoSync(video);

    expect(mockExtendMappingTTL).toHaveBeenCalledWith(mapping.id);
    expect(mockSyncEpisodeToAnilist).toHaveBeenCalledWith(video, mapping, "token-123");
  });

  test("creates a mapping from an exact season-year search match and syncs it", async () => {
    mockFindMapping.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          anime: {
            results: [{ id: 813, idMal: 813, episodes: 291, seasonYear: 2020, title: { english: "Dragon Ball Z" } }],
          },
        },
      }),
    });
    const createdMapping = buildMapping({ id: "mapping-new" });
    mockCreateMapping.mockResolvedValue(createdMapping);

    const video = buildVideo({ watching_season_year: 2020 });
    await attemptAnilistAutoSync(video);

    expect(mockCreateMapping).toHaveBeenCalledWith(expect.objectContaining({ anilist_series_id: 813, season_year: 2020 }));
    expect(mockSyncEpisodeToAnilist).toHaveBeenCalledWith(video, createdMapping, "token-123");
  });

  test("queues a pending review when search results are ambiguous", async () => {
    mockFindMapping.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          anime: {
            results: [
              { id: 1, seasonYear: 1989, title: { english: "A" } },
              { id: 2, seasonYear: 1991, title: { english: "B" } },
            ],
          },
        },
      }),
    });

    await attemptAnilistAutoSync(buildVideo({ watching_season_year: 2020 }));

    expect(mockAddPendingAnilistSync).toHaveBeenCalledWith(expect.objectContaining({ video_id: "video-1" }));
    expect(mockRefreshAnilistPendingBadge).toHaveBeenCalled();
    expect(mockSyncEpisodeToAnilist).not.toHaveBeenCalled();
  });

  test("does not sync when there is no access token", async () => {
    mockGetAnilistAuth.mockImplementation((cb) => cb(null));
    mockFindMapping.mockResolvedValue(buildMapping());

    await attemptAnilistAutoSync(buildVideo());

    expect(mockSyncEpisodeToAnilist).not.toHaveBeenCalled();
  });
});
