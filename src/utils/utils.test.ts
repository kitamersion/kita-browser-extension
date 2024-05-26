import { IVideo } from "@/types/video";
import { convertToSeconds, filterVideos, formatDuration, formatTimestamp, generateUniqueCode, getDateFromNow, randomOffset } from ".";

describe("formatDuration function", () => {
  test.each([
    [30, "0h 0m 30s"],
    [1500, "0h 25m 0s"],
    [3720, "1h 2m 0s"],
    [3600, "1h 0m 0s"],
    [86400, "24h 0m 0s"],
    [93720, "26h 2m 0s"],
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
    [30, "0h 0m 30s"],
    [1500, "0h 25m 0s"],
    [3720, "1h 2m 0s"],
    [3600, "1h 0m 0s"],
    [86400, "24h 0m 0s"],
    [93720, "26h 2m 0s"],
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
