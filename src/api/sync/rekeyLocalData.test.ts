jest.mock("@/db/index", () => ({
  __esModule: true,
  default: {
    getAllTags: jest.fn(),
    getAllVideos: jest.fn(),
    getAllVideoTags: jest.fn(),
    getAllAutoTags: jest.fn(),
    replaceAllTags: jest.fn().mockResolvedValue(undefined),
    replaceAllVideos: jest.fn().mockResolvedValue(undefined),
    replaceAllVideoTags: jest.fn().mockResolvedValue(undefined),
    replaceAllAutoTags: jest.fn().mockResolvedValue(undefined),
    setLastSyncedAt: jest.fn().mockResolvedValue(undefined),
  },
}));

import IndexedDB from "@/db/index";
import { rekeyLocalDataForNewAccount } from "./rekeyLocalData";

describe("rekeyLocalDataForNewAccount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("assigns every row a fresh id and resets the sync cursor", async () => {
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "tag-1", name: "Anime", code: "ANIME", updated_at: 100 }]);
    (IndexedDB.getAllVideos as jest.Mock).mockResolvedValue([
      { id: "video-1", video_title: "Ep 1", video_duration: 100, video_url: "u", origin: "CRUNCHYROLL", created_at: 1, updated_at: 100 },
    ]);
    (IndexedDB.getAllVideoTags as jest.Mock).mockResolvedValue([{ id: "vt-1", video_id: "video-1", tag_id: "tag-1", updated_at: 100 }]);
    (IndexedDB.getAllAutoTags as jest.Mock).mockResolvedValue([{ id: "at-1", origin: "CRUNCHYROLL", tags: ["tag-1"], updated_at: 100 }]);

    await rekeyLocalDataForNewAccount();

    const [writtenTags] = (IndexedDB.replaceAllTags as jest.Mock).mock.calls[0];
    const [writtenVideos] = (IndexedDB.replaceAllVideos as jest.Mock).mock.calls[0];
    const [writtenVideoTags] = (IndexedDB.replaceAllVideoTags as jest.Mock).mock.calls[0];
    const [writtenAutoTags] = (IndexedDB.replaceAllAutoTags as jest.Mock).mock.calls[0];

    expect(writtenTags[0].id).not.toBe("tag-1");
    expect(writtenVideos[0].id).not.toBe("video-1");
    expect(writtenVideoTags[0].id).not.toBe("vt-1");
    expect(writtenAutoTags[0].id).not.toBe("at-1");
    expect(IndexedDB.setLastSyncedAt).toHaveBeenCalledWith(0);
  });

  test("remaps video_tags' video_id and tag_id to the new ids", async () => {
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "tag-1", name: "Anime", code: "ANIME", updated_at: 100 }]);
    (IndexedDB.getAllVideos as jest.Mock).mockResolvedValue([
      { id: "video-1", video_title: "Ep 1", video_duration: 100, video_url: "u", origin: "CRUNCHYROLL", created_at: 1, updated_at: 100 },
    ]);
    (IndexedDB.getAllVideoTags as jest.Mock).mockResolvedValue([{ id: "vt-1", video_id: "video-1", tag_id: "tag-1", updated_at: 100 }]);
    (IndexedDB.getAllAutoTags as jest.Mock).mockResolvedValue([]);

    await rekeyLocalDataForNewAccount();

    const [writtenTags] = (IndexedDB.replaceAllTags as jest.Mock).mock.calls[0];
    const [writtenVideos] = (IndexedDB.replaceAllVideos as jest.Mock).mock.calls[0];
    const [writtenVideoTags] = (IndexedDB.replaceAllVideoTags as jest.Mock).mock.calls[0];

    expect(writtenVideoTags[0].video_id).toBe(writtenVideos[0].id);
    expect(writtenVideoTags[0].tag_id).toBe(writtenTags[0].id);
  });

  test("remaps auto_tags' tags array to the new tag ids", async () => {
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "tag-1", name: "Anime", code: "ANIME", updated_at: 100 }]);
    (IndexedDB.getAllVideos as jest.Mock).mockResolvedValue([]);
    (IndexedDB.getAllVideoTags as jest.Mock).mockResolvedValue([]);
    (IndexedDB.getAllAutoTags as jest.Mock).mockResolvedValue([{ id: "at-1", origin: "CRUNCHYROLL", tags: ["tag-1"], updated_at: 100 }]);

    await rekeyLocalDataForNewAccount();

    const [writtenTags] = (IndexedDB.replaceAllTags as jest.Mock).mock.calls[0];
    const [writtenAutoTags] = (IndexedDB.replaceAllAutoTags as jest.Mock).mock.calls[0];

    expect(writtenAutoTags[0].tags).toEqual([writtenTags[0].id]);
  });

  test("bumps updated_at on every rekeyed row", async () => {
    (IndexedDB.getAllTags as jest.Mock).mockResolvedValue([{ id: "tag-1", name: "Anime", code: "ANIME", updated_at: 100 }]);
    (IndexedDB.getAllVideos as jest.Mock).mockResolvedValue([]);
    (IndexedDB.getAllVideoTags as jest.Mock).mockResolvedValue([]);
    (IndexedDB.getAllAutoTags as jest.Mock).mockResolvedValue([]);

    const before = Date.now();
    await rekeyLocalDataForNewAccount();
    const after = Date.now();

    const [writtenTags] = (IndexedDB.replaceAllTags as jest.Mock).mock.calls[0];
    expect(writtenTags[0].updated_at).toBeGreaterThanOrEqual(before);
    expect(writtenTags[0].updated_at).toBeLessThanOrEqual(after);
  });
});
