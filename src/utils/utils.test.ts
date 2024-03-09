import { formatTime } from ".";

describe("formatTime function", () => {
  test("formats seconds less than a minute correctly", () => {
    expect(formatTime(30)).toEqual("0h 0m 30s");
  });

  test("formats seconds less than an hour correctly", () => {
    expect(formatTime(1500)).toEqual("0h 25m 0s");
  });

  test("formats seconds more than an hour correctly", () => {
    expect(formatTime(3720)).toEqual("1h 2m 0s");
  });

  test("formats seconds equal to an hour correctly", () => {
    expect(formatTime(3600)).toEqual("1h 0m 0s");
  });

  test("formats seconds equal to a day correctly", () => {
    expect(formatTime(86400)).toEqual("24h 0m 0s");
  });

  test("formats seconds greater than a day correctly", () => {
    expect(formatTime(93720)).toEqual("26h 2m 0s");
  });
});
