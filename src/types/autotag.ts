import { SiteKey } from "./video";

export type IAutoTag = {
  id?: string;
  origin: SiteKey;
  tags: string[];
  updated_at?: number;
  deleted_at?: number;
};
