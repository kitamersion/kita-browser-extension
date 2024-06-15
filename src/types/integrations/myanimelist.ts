export type MyAnimeListConfig = {
  myAnimeListId: string;
  secret: string;
  redirectUrl: string;
};

export type MyAnimeListAuth = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  issued_at?: number;
};
