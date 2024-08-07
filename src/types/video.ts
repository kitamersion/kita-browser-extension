export type IVideo = {
  id: string; // @todo: readonly
  video_title: string;
  video_duration: number;
  video_url: string;
  origin: SiteKey;
  created_at: number;
  unique_code?: string;
  updated_at?: number;
  tags?: string[];
  watching_episode_number?: number;
  watching_season_year?: number;
  media_type?: MediaTypes;
  series_title?: string;
  series_episode_number?: number;
  series_season_year?: number;
  anilist_series_id?: number;
  mal_series_id?: number;
  background_cover_image?: string;
  banner_image?: string;
};

export type MediaTypes = "ANIME" | "MANGA";

export type IPaginatedVideos = {
  page: number;
  pageSize: number;
  results: IVideo[];
  totalPages: number;
};

export enum SiteKey {
  YOUTUBE = "YOUTUBE",
  YOUTUBE_MUSIC = "YOUTUBE_MUSIC",
  CRUNCHYROLL = "CRUNCHYROLL",
}

export type ITotal = {
  total_watched: number;
  total_duration: number;
};

type TitleLookup = "DOCUMENT_TITLE" | "QUERY_SELECT";

export type SiteConfig = {
  titleLookup: TitleLookup;
  replaceString: string;
  originUrl: string;
  durationKey: string;
};

export type SiteConfigDictionary = {
  [key in SiteKey]: SiteConfig;
};
