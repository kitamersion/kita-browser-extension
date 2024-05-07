import { getAnilistConfig, getAnilistAuthUrl, setAnilistAuth, setAnilistAuthStatus, setAnilistConfig } from "@/api/integration/anilist";
import { INTEGRATION_ANILIST_AUTH_CONNECT, VIDEO_ADD } from "@/data/events";
import IndexedDB from "@/db/index";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";

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
      console.log("Received ADD_VIDEO with payload:", parsedPayload);
      await IndexedDB.addVideo(parsedPayload);
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
    // get and check if tags are initialized

    await IndexedDB.initializeDefaultTags();

    // set tags are initialized
  })();
});
