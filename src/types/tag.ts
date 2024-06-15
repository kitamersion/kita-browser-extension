export type ITag = {
  id?: string;
  name: string;
  code?: string;
  created_at?: number;
  color?: string; // hex color
  owner?: TagOwner;
};

type TagOwner = "USER" | "INTEGRATION_ANILIST" | "INTEGRATION_MYANIMELIST";
