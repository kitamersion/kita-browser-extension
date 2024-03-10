import { formatDuration, formatTimestamp } from ".";

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

describe("formatTimestamp function", () => {
  test.each([
    [1709958630709, "09-03-2024"],
    [1646402400000, "05-03-2022"],
    [1664371200000, "29-09-2022"],
    [1686105600000, "07-06-2023"],
  ])("should return formatted date from %i to => %s", (timestamp, expectedDate) => {
    const formattedDate = formatTimestamp(timestamp);

    expect(formattedDate).toBe(expectedDate);
  });
});
