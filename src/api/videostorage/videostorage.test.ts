import { IVideo, SiteKey } from "../../types/video";
import { deleteVideoById, getVideoById, getVideos, setVideos, updateVideoById } from ".";

const mockVideos: IVideo[] = [
  {
    id: "39b33f35-b0de-44d3-b572-05714085588a",
    video_title: "Video 1",
    video_duration: 120, // duration in seconds
    video_url: "http://example.com/video1",
    origin: SiteKey.YOUTUBE,
    created_at: Date.now() - 3600 * 1000, // 1 hour ago
  },
  {
    id: "22f72ece-dde7-4b5f-a325-d27c3eeb1d22",
    video_title: "Video 2",
    video_duration: 180,
    video_url: "http://example.com/video2",
    origin: SiteKey.YOUTUBE_MUSIC,
    created_at: Date.now() - 7200 * 1000, // 2 hours ago
  },
  {
    id: "84f73ea9-316d-43d6-876b-3b39495d9743",
    video_title: "Video 3",
    video_duration: 300, // 5 minutes
    video_url: "http://example.com/video3",
    origin: SiteKey.CRUNCHYROLL,
    created_at: Date.now() - 86400 * 1000, // 1 day ago
  },
];

describe("Video storage tests", () => {
  beforeEach(() => {
    // Mock Chrome storage methods
    global.chrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
        },
      },
    } as never;
  });

  describe("getVideoById tests", () => {
    test("returns correct video", () => {
      expect(getVideoById("39b33f35-b0de-44d3-b572-05714085588a", mockVideos)).toEqual(mockVideos[0]);
    });

    test("returns null if video not found", () => {
      expect(getVideoById("1", mockVideos)).toBeNull();
    });
  });

  describe("getVideos tests", () => {
    test("fetches videos from storage", () => {
      const callback = jest.fn();
      getVideos(callback);
      expect(global.chrome.storage.local.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("setVideos tests", () => {
    test("sets multiple videos in storage", () => {
      const callback = jest.fn();
      setVideos(mockVideos, callback);
      expect(global.chrome.storage.local.set).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateVideoById tests", () => {
    test("updates video by ID", () => {
      const callback = jest.fn();

      // Mock updated video data
      const updatedVideo: IVideo = {
        id: "22f72ece-dde7-4b5f-a325-d27c3eeb1d22",
        video_title: "Updated Video",
        video_duration: 200,
        video_url: "http://example.com/updatedvideo",
        origin: SiteKey.YOUTUBE_MUSIC,
        created_at: Date.now() - 7200 * 1000, // 2 hours ago
      };

      updateVideoById("22f72ece-dde7-4b5f-a325-d27c3eeb1d22", updatedVideo, mockVideos, callback);

      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteVideoById tests", () => {
    test("deletes video by ID", () => {
      deleteVideoById("22f72ece-dde7-4b5f-a325-d27c3eeb1d22", mockVideos, (data) => {
        expect(data).toEqual([
          {
            id: "39b33f35-b0de-44d3-b572-05714085588a",
            video_title: "Video 1",
            video_duration: 120, // duration in seconds
            video_url: "http://example.com/video1",
            origin: SiteKey.YOUTUBE,
            created_at: Date.now() - 3600 * 1000,
          },
          {
            id: "84f73ea9-316d-43d6-876b-3b39495d9743",
            video_title: "Video 3",
            video_duration: 300, // 5 minutes
            video_url: "http://example.com/video3",
            origin: SiteKey.CRUNCHYROLL,
            created_at: Date.now() - 86400 * 1000, // 1 day ago
          },
        ]);
      });

      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
    });

    test("handles non-existent video ID", () => {
      const callback = jest.fn();
      deleteVideoById("non-existent-id", mockVideos, callback);

      expect(chrome.storage.local.set).toHaveBeenCalledTimes(0);
    });
  });
});
