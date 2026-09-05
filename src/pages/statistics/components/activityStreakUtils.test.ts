import { buildActivityStreak } from "./activityStreakUtils";
import { IVideo, SiteKey } from "@/types/video";

const makeVideo = (created_at: number, id = "1"): IVideo => ({
  id,
  video_title: "Video",
  video_duration: 100,
  video_url: "https://example.com",
  origin: SiteKey.YOUTUBE,
  created_at,
});

// Wednesday, so the grid must pad backwards to the preceding Sunday.
const REFERENCE_DATE = new Date("2024-06-19T12:00:00.000Z");

describe("buildActivityStreak", () => {
  test("produces weekCount weeks of 7 days each", () => {
    const { weeks } = buildActivityStreak([], REFERENCE_DATE, 13);
    expect(weeks).toHaveLength(13);
    weeks.forEach((week) => expect(week).toHaveLength(7));
  });

  test("every week starts on a Sunday and ends on a Saturday", () => {
    const { weeks } = buildActivityStreak([], REFERENCE_DATE);
    weeks.forEach((week) => {
      expect(new Date(week[0].date).getUTCDay()).toBe(0);
      expect(new Date(week[6].date).getUTCDay()).toBe(6);
    });
  });

  test("marks days after the reference date as future, and excludes them from totals", () => {
    const { weeks, totalInRange } = buildActivityStreak([], REFERENCE_DATE);
    const lastWeek = weeks[weeks.length - 1];
    const futureDays = lastWeek.filter((day) => day.isFuture);

    // Reference date is a Wednesday: Thu/Fri/Sat of the final week are future.
    expect(futureDays).toHaveLength(3);
    futureDays.forEach((day) => {
      expect(day.level).toBe(0);
      expect(day.count).toBe(0);
    });
    expect(totalInRange).toBe(0);
  });

  test("counts videos per day and assigns level 0 to days with no activity", () => {
    const videos = [makeVideo(new Date("2024-06-17T08:00:00.000Z").getTime())];
    const { weeks } = buildActivityStreak(videos, REFERENCE_DATE);

    const activeDay = weeks.flat().find((day) => day.date === "2024-06-17");
    const idleDay = weeks.flat().find((day) => day.date === "2024-06-16");

    expect(activeDay?.count).toBe(1);
    expect(activeDay?.level).toBe(4);
    expect(idleDay?.count).toBe(0);
    expect(idleDay?.level).toBe(0);
  });

  test("scales levels relative to the busiest day in range", () => {
    const day = (iso: string, count: number) => Array.from({ length: count }, (_, i) => makeVideo(new Date(iso).getTime(), `${iso}-${i}`));

    const videos = [...day("2024-06-10T00:00:00.000Z", 1), ...day("2024-06-11T00:00:00.000Z", 4), ...day("2024-06-12T00:00:00.000Z", 8)];
    const { weeks } = buildActivityStreak(videos, REFERENCE_DATE);
    const byDate = new Map(weeks.flat().map((d) => [d.date, d]));

    const lowLevel = byDate.get("2024-06-10")?.level ?? -1;
    const midLevel = byDate.get("2024-06-11")?.level ?? -1;
    const highLevel = byDate.get("2024-06-12")?.level ?? -1;

    expect(highLevel).toBe(4); // busiest day always maxes out
    expect(lowLevel).toBeLessThan(midLevel);
    expect(midLevel).toBeLessThan(highLevel);
  });

  test("totalInRange sums counts across all non-future days", () => {
    const videos = [
      makeVideo(new Date("2024-06-01T00:00:00.000Z").getTime(), "a"),
      makeVideo(new Date("2024-06-01T05:00:00.000Z").getTime(), "b"),
      makeVideo(new Date("2024-06-15T00:00:00.000Z").getTime(), "c"),
    ];
    const { totalInRange } = buildActivityStreak(videos, REFERENCE_DATE);
    expect(totalInRange).toBe(3);
  });

  test("ignores videos created before the visible window", () => {
    const videos = [makeVideo(new Date("2020-01-01T00:00:00.000Z").getTime())];
    const { totalInRange } = buildActivityStreak(videos, REFERENCE_DATE);
    expect(totalInRange).toBe(0);
  });

  test("returns one month label per distinct month across the grid, in week order", () => {
    const { monthLabels } = buildActivityStreak([], REFERENCE_DATE);
    const weekIndexes = monthLabels.map((m) => m.weekIndex);
    expect(weekIndexes).toEqual([...weekIndexes].sort((a, b) => a - b));
    expect(monthLabels.length).toBeGreaterThan(0);
    expect(monthLabels[0].weekIndex).toBe(0);
  });
});
