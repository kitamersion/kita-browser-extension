export type IVideo = {
  id: string; // @todo: readonly
  video_title: string;
  video_duration: number;
  video_url: string;
  origin: SiteKey;
  created_at: number;
};

export type ITotal = {
  total_watched: number;
  total_duration: number;
};

export enum SiteKey {
  YOUTUBE = "YOUTUBE",
  YOUTUBE_MUSIC = "YOUTUBE_MUSIC",
  CRUNCHYROLL = "CRUNCHYROLL",
}

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
