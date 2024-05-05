import { convertToSeconds, formatDuration, formatTimestamp } from ".";

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
