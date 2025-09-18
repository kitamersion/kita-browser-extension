export type SourcePlatform = "crunchyroll" | "netflix" | "hidive" | "youtube" | "funimation" | "hulu";

export interface ISeriesMapping {
  id: string;

  // Source info
  series_title: string; // Original title from source platform
  normalized_title: string; // Lowercase, no special chars for fuzzy matching
  source_platform: SourcePlatform;
  season_year?: number; // For season-specific mapping

  // Target platform mappings (expandable for future integrations)
  anilist_series_id?: number;
  mal_series_id?: number;
  kitsu_series_id?: number; // Future integration
  tmdb_series_id?: number; // Future integration

  // Metadata
  created_at: number;
  updated_at: number;
  expires_at: number; // Very long TTL (1 year)
  user_confirmed: boolean; // true if manually selected by user

  // Optional additional info for better matching
  total_episodes?: number;
  series_description?: string;
  cover_image?: string;

  // Additional visual metadata (from Anilist)
  background_cover_image?: string;
  banner_image?: string;
}

// For the selection popup
export interface ISeriesSearchResult {
  id: number;
  title: {
    english?: string;
    romaji?: string;
    native?: string;
  };
  seasonYear?: number;
  episodes?: number;
  coverImage?: {
    large?: string;
    extraLarge?: string;
  };
  bannerImage?: string;
  description?: string;
  idMal?: number;
}
