import { SiteConfigDictionary, SiteKey } from "@/types/video";
import { VERSION } from "./version";

export const TITLE = "Kita Browser";
export const TITLE_ON = `${TITLE} (ON)`;
export const TITLE_OFF = `${TITLE} (OFF)`;

export const APP_VERSION = VERSION;

export const DEFAULT_TAGS = [
  { name: "Anime", code: "ANIME" },
  { name: "Book", code: "BOOK" },
  { name: "Listening", code: "LISTENING" },
  { name: "Reading", code: "READING" },
  { name: "Manga", code: "MANGA" },
  { name: "VN", code: "VN" },
];

export const CONTENT_SITE_CONFIG: SiteConfigDictionary = {
  [SiteKey.YOUTUBE]: {
    titleLookup: "DOCUMENT_TITLE",
    replaceString: "- YouTube",
    originUrl: "www.youtube.com",
    durationKey: ".ytp-time-duration",
  },
  [SiteKey.YOUTUBE_MUSIC]: {
    titleLookup: "DOCUMENT_TITLE",
    replaceString: "- YouTube",
    originUrl: "music.youtube.com",
    durationKey: ".time-info",
  },
  [SiteKey.CRUNCHYROLL]: {
    titleLookup: "DOCUMENT_TITLE",
    replaceString: "- Watch on Crunchyroll",
    originUrl: "www.crunchyroll.com",
    durationKey: "meta[property='video:duration']",
  },
};

export const KITA_AUTH_PROXY_URL = "https://kita-auth-proxy.onrender.com";
