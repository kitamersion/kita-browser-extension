import { AniListCacheCategory } from "@/api/anilistCache";

export interface CachePreview {
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

export function getCachePreview(category: AniListCacheCategory, key: string, value: unknown): CachePreview {
  switch (category) {
    case "profile": {
      const profile = value as { name?: string; avatar?: { medium?: string } } | undefined;
      return {
        title: profile?.name ?? key,
        subtitle: "AniList profile",
        imageUrl: profile?.avatar?.medium,
      };
    }
    case "lists": {
      const status = key.split(":")[2] ?? "unknown";
      const collection = value as { lists?: { entries?: unknown[] }[] } | undefined;
      const count = (collection?.lists ?? []).reduce((sum, list) => sum + (list.entries?.length ?? 0), 0);
      return {
        title: `${status} list`,
        subtitle: `${count} ${count === 1 ? "entry" : "entries"}`,
      };
    }
    case "collections": {
      const items = Array.isArray(value) ? value : [];
      const isGenres = key === "genreCollection";
      return {
        title: isGenres ? "Genre collection" : "Tag collection",
        subtitle: `${items.length} ${isGenres ? "genres" : "tags"}`,
      };
    }
    case "search": {
      const page = value as
        | {
            media?: { title?: { userPreferred?: string }; coverImage?: { large?: string } }[];
            pageInfo?: { total?: number };
          }
        | undefined;
      const first = page?.media?.[0];
      const total = page?.pageInfo?.total ?? page?.media?.length ?? 0;
      return {
        title: first?.title?.userPreferred ?? "Search results",
        subtitle: `${total} ${total === 1 ? "result" : "results"}`,
        imageUrl: first?.coverImage?.large,
      };
    }
    default:
      return { title: key };
  }
}
