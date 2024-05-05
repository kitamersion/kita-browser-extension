import { IVideo } from "@/types/video";
import { calculateTotalDuration } from "./index";

describe("calculateTotalDuration function", () => {
  test("returns the total duration of videos", () => {
    const videos = [{ video_duration: 30 }, { video_duration: 60 }, { video_duration: 90 }] as IVideo[];

    const totalDuration = calculateTotalDuration(videos);

    expect(totalDuration).toBe(180);
  });

  test("returns 0 if no videos are provided", () => {
    const videos: IVideo[] = [];

    const totalDuration = calculateTotalDuration(videos);

    expect(totalDuration).toBe(0);
  });
});
