import { IVideo } from "@/types/video";

export type StreakLevel = 0 | 1 | 2 | 3 | 4;

export type StreakDay = {
  date: string;
  count: number;
  level: StreakLevel;
  isFuture: boolean;
};

export type StreakMonthLabel = {
  weekIndex: number;
  label: string;
};

export type ActivityStreak = {
  weeks: StreakDay[][];
  monthLabels: StreakMonthLabel[];
  totalInRange: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toDateKey = (date: Date): string => date.toISOString().split("T")[0];

const startOfWeekSunday = (date: Date): Date => {
  const utcMidnight = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - utcMidnight.getUTCDay());
  return utcMidnight;
};

const levelFor = (count: number, maxCount: number): StreakLevel => {
  if (count <= 0 || maxCount <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / maxCount) * 4))) as StreakLevel;
};

// Builds a GitHub-style contribution grid: `weekCount` full Sun-Sat weeks
// ending on the week containing `referenceDate`. Days after `referenceDate`
// (padding at the end of the current week) are marked isFuture so callers
// can render them as blank spacer cells instead of "zero activity" days.
export function buildActivityStreak(videos: IVideo[], referenceDate: Date = new Date(), weekCount = 13): ActivityStreak {
  const todayKey = toDateKey(referenceDate);
  const currentWeekStart = startOfWeekSunday(referenceDate);
  const gridStart = new Date(currentWeekStart.getTime() - (weekCount - 1) * DAYS_PER_WEEK * DAY_MS);

  const countsByDate = new Map<string, number>();
  for (const video of videos) {
    const key = toDateKey(new Date(video.created_at));
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }

  const totalDays = weekCount * DAYS_PER_WEEK;
  const days: { date: Date; key: string; count: number; isFuture: boolean }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(gridStart.getTime() + i * DAY_MS);
    const key = toDateKey(date);
    const isFuture = key > todayKey;
    days.push({ date, key, count: isFuture ? 0 : (countsByDate.get(key) ?? 0), isFuture });
  }

  const maxCount = Math.max(0, ...days.filter((day) => !day.isFuture).map((day) => day.count));

  const weeks: StreakDay[][] = [];
  const monthLabels: StreakMonthLabel[] = [];
  let lastMonth = -1;

  for (let w = 0; w < weekCount; w++) {
    const week: StreakDay[] = [];
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const day = days[w * DAYS_PER_WEEK + d];
      week.push({
        date: day.key,
        count: day.count,
        level: day.isFuture ? 0 : levelFor(day.count, maxCount),
        isFuture: day.isFuture,
      });
    }
    weeks.push(week);

    const sundayMonth = days[w * DAYS_PER_WEEK].date.getUTCMonth();
    if (sundayMonth !== lastMonth) {
      monthLabels.push({ weekIndex: w, label: MONTH_LABELS[sundayMonth] });
      lastMonth = sundayMonth;
    }
  }

  const totalInRange = days.filter((day) => !day.isFuture).reduce((sum, day) => sum + day.count, 0);

  return { weeks, monthLabels, totalInRange };
}
