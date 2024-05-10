import { getAnilistConfig, getAnilistAuthUrl, setAnilistAuth, setAnilistAuthStatus, setAnilistConfig } from "@/api/integration/anilist";
import { incrementTotalTags } from "@/api/summaryStorage/tag";
import { incrementTotalVideoDuration, incrementTotalVideos } from "@/api/summaryStorage/video";
import { getDefaultTagsInitialized, setDefaultTagsInitialized } from "@/api/tags";
import { INTEGRATION_ANILIST_AUTH_CONNECT, VIDEO_ADD } from "@/data/events";
import IndexedDB from "@/db/index";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";
import { IVideo } from "@/types/video";
import { generateUniqueCode } from "@/utils";

export type RuntimeResponse = {
  status: RuntimeStatus;
  message: string;
};

type RuntimeStatus = "error" | "success" | "unknown";

// EVENT HANDLERS
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  let parsedPayload;
  try {
    parsedPayload = JSON.parse(request.payload);
  } catch (e) {
    console.error("Error parsing payload", e);
    const response: RuntimeResponse = { status: "error", message: "error parsing payload" };
    sendResponse(response);
    return;
  }

  if (request.type === VIDEO_ADD) {
    (async () => {
      console.log("[KITA_BROWSER] received ADD_VIDEO event");
      const { video_title, origin, video_duration } = parsedPayload as IVideo;
      const uniqueCode = generateUniqueCode(video_title, origin);

      try {
        const hasExistingVideoItem = await IndexedDB.getVideoByUniqueCode(uniqueCode);
        if (hasExistingVideoItem) {
          console.info("[KITA_BROWSER] video already exists, skipping...");
          return;
        }
        await IndexedDB.addVideo({ ...parsedPayload, unique_code: uniqueCode });
        incrementTotalVideos();
        incrementTotalVideoDuration(video_duration ?? 0);
      } catch (error) {
        console.error("[KITA_BROWSER] error while adding video: ", error);
      }
    })();
    return;
  }

  if (request.type === INTEGRATION_ANILIST_AUTH_CONNECT) {
    (async () => {
      const success = await authorizeAnilist(parsedPayload);
      if (success) {
        setAnilistAuthStatus("authorized", () => {});
      } else {
        setAnilistAuthStatus("error", () => {});
      }
    })();
  }
});

const launchWebAuthFlow = (authUrl: string): Promise<string | undefined> => {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      (url) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        } else {
          resolve(url);
        }
      }
    );
  });
};

const authorizeAnilist = async (anilistConfig: AnilistConfig): Promise<boolean> => {
  try {
    const authUrl = getAnilistAuthUrl(anilistConfig.anilistId);
    const redirectUrl = await launchWebAuthFlow(authUrl);

    const url = new URL(redirectUrl ?? "");
    const params = new URLSearchParams(url.hash.substring(1)); // Remove leading '#'
    const accessToken = params.get("access_token");
    const expires = params.get("expires_in");
    const tokenType = params.get("token_type");

    const anilistAuth: AnilistAuth = {
      access_token: accessToken ?? "",
      token_type: tokenType ?? "",
      // expires_in: 10, // @todo for testing remove when fisnished
      expires_in: expires ? parseInt(expires) : 0,
      issued_at: Date.now(),
    };

    setAnilistAuth(anilistAuth, () => {});

    return true;
  } catch (error) {
    console.error("Error authorizing anilist", error);
    return false;
  }
};

(() => {
  const redirectUrl = chrome.identity.getRedirectURL("callback");

  getAnilistConfig((config) => {
    if (!config) {
      setAnilistConfig({ anilistId: "", secret: "", redirectUrl: redirectUrl }, () => {});
    } else if (config.redirectUrl !== redirectUrl) {
      setAnilistConfig({ ...config, redirectUrl }, () => {});
    }
  });
})();

chrome.runtime.onInstalled.addListener(() => {
  (async () => {
    // initialize default tags
    getDefaultTagsInitialized(async (isInitialized) => {
      if (!isInitialized) {
        const addedTagsCount = await IndexedDB.initializeDefaultTags();
        incrementTotalTags(addedTagsCount);
        setDefaultTagsInitialized(() => {});
      }
    });
  })();
});
