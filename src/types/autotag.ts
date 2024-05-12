import { SiteKey } from "./video";

export type IAutoTag = {
  id?: string;
  origin: SiteKey;
  tags: string[];
};
