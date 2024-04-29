export type AnilistConfig = {
  anilistId: string;
  secret: string;
  redirectUrl: string;
};

export type AnilistAuth = {
  access_token: string;
  token_type: string;
  expires_in: number;
  issued_at?: number;
};
