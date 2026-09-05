import { IVideo, SiteKey } from "@/types/video";

export type PlatformBreakdownEntry = {
  origin: SiteKey;
  count: number;
  percentage: number;
};

// Only platforms actually present in the data are returned (sorted busiest
// first), so a library that only ever used one source doesn't show two
// empty rows for the others.
export function buildPlatformBreakdown(videos: IVideo[]): PlatformBreakdownEntry[] {
  const countsByOrigin = new Map<SiteKey, number>();
  for (const video of videos) {
    countsByOrigin.set(video.origin, (countsByOrigin.get(video.origin) ?? 0) + 1);
  }

  const maxCount = Math.max(0, ...countsByOrigin.values());

  return Array.from(countsByOrigin.entries())
    .map(([origin, count]) => ({ origin, count, percentage: maxCount > 0 ? (count / maxCount) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}
