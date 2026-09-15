import db, { AniListCacheRow } from "@/db";

export type AniListCacheCategory = "profile" | "lists" | "collections" | "search" | "other";

export interface AniListCacheEntry extends AniListCacheRow {
  sizeBytes: number;
}

export interface AniListCacheCategorySummary {
  category: AniListCacheCategory;
  label: string;
  entries: AniListCacheEntry[];
  totalSizeBytes: number;
}

export const CACHE_CATEGORY_ORDER: AniListCacheCategory[] = ["profile", "lists", "collections", "search", "other"];

const CACHE_CATEGORY_LABELS: Record<AniListCacheCategory, string> = {
  profile: "Profile",
  lists: "Anime Lists",
  collections: "Genre/Tag Collections",
  search: "Search Results",
  other: "Other",
};

export function categorizeCacheKey(key: string): AniListCacheCategory {
  if (key === "profile") return "profile";
  if (key.startsWith("list:")) return "lists";
  if (key === "genreCollection" || key === "tagCollection") return "collections";
  if (key.startsWith("search:")) return "search";
  return "other";
}

function sizeOf(value: unknown): number {
  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return 0;
  }
}

export async function getCategorizedCacheEntries(): Promise<AniListCacheCategorySummary[]> {
  const rows = await db.getAllAniListCacheEntries();

  const byCategory = new Map<AniListCacheCategory, AniListCacheEntry[]>();
  for (const category of CACHE_CATEGORY_ORDER) byCategory.set(category, []);

  for (const row of rows) {
    const category = categorizeCacheKey(row.key);
    (byCategory.get(category) ?? []).push({ ...row, sizeBytes: sizeOf(row.value) });
  }

  return CACHE_CATEGORY_ORDER.map((category) => {
    const entries = byCategory.get(category) ?? [];
    return {
      category,
      label: CACHE_CATEGORY_LABELS[category],
      entries,
      totalSizeBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    };
  });
}

export async function deleteCacheEntry(key: string): Promise<void> {
  await db.deleteAniListCache(key);
}

export async function clearCacheCategory(category: AniListCacheCategory): Promise<void> {
  const rows = await db.getAllAniListCacheEntries();
  const keysToDelete = rows.filter((row) => categorizeCacheKey(row.key) === category).map((row) => row.key);
  await Promise.all(keysToDelete.map((key) => db.deleteAniListCache(key)));
}

export async function clearAllCache(): Promise<void> {
  await db.clearAniListCache();
}
