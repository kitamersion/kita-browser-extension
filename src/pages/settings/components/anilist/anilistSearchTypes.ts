import { MediaFormat, MediaListStatus } from "@/graphql";

export type AnilistSearchMediaResult = {
  id: number;
  title?: { userPreferred?: string | null } | null;
  coverImage?: { extraLarge?: string | null; large?: string | null } | null;
  seasonYear?: number | null;
  format?: MediaFormat | null;
  episodes?: number | null;
  averageScore?: number | null;
  genres?: (string | null)[] | null;
  siteUrl?: string | null;
  mediaListEntry?: { status?: MediaListStatus | null } | null;
};
