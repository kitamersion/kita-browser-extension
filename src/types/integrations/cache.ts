import { MediaTypes } from "../video";

export type IMediaCache = {
  id: string;
  unique_code?: string;
  watching_episode_number?: number;
  watching_season_year?: number;
  media_type?: MediaTypes;
  series_title?: string;
  series_episode_number?: number;
  series_season_year?: number;
  anilist_series_id?: number;
  mal_series_id?: number;
  crunchyrole_series_id?: number;
  background_cover_image?: string;
  banner_image?: string;
  created_at?: number;
  expires_at?: number;
  used_by?: string;
  is_anilist_synced?: boolean;
  is_mal_synced?: boolean;
};
