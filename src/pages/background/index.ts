import { getAnilistConfig, getAnilistAuthUrl, setAnilistAuth, setAnilistAuthStatus, setAnilistConfig } from "@/api/integration/anilist";
import { incrementTotalVideoDuration, incrementTotalVideos } from "@/api/summaryStorage/video";
import logger from "@/config/logger";
import { KITA_AUTH_PROXY_URL } from "@/data/contants";
import { INTEGRATION_ANILIST_AUTH_CONNECT, VIDEO_ADD } from "@/data/events";
import IndexedDB from "@/db/index";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";
import { IVideoTag } from "@/types/relationship";
import { IVideo } from "@/types/video";
import { generateRandomString, generateUniqueCode } from "@/utils";
import { SHA256 } from "crypto-js";

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
  } catch (error) {
    logger.error(`Error parsing payload ${error}`);
    const response: RuntimeResponse = { status: "error", message: "error parsing payload" };
    sendResponse(response);
    return;
  }

  if (request.type === VIDEO_ADD) {
    (async () => {
      logger.info("received VIDEO_ADD event");
      const { id, video_title, origin, video_duration } = parsedPayload as IVideo;
      const uniqueCode = generateUniqueCode(video_title, origin);

      try {
        const hasExistingVideoItem = await IndexedDB.getVideoByUniqueCode(uniqueCode);
        if (hasExistingVideoItem) {
          logger.info("video already exists, skipping...");
          return;
        }

        // apply auto tags
        const autoTag = await IndexedDB.getAutoTagByOrigin(origin);
        if (autoTag) {
          parsedPayload.tags = autoTag.tags;
        }

        await IndexedDB.addVideo({ ...parsedPayload, unique_code: uniqueCode });
        incrementTotalVideos();
        incrementTotalVideoDuration(video_duration ?? 0);

        if (autoTag) {
          const videoTagRelationship: IVideoTag[] = autoTag.tags.map((tag_id) => {
            return {
              id: self.crypto.randomUUID(),
              video_id: id,
              tag_id: tag_id,
            };
          });

          if (videoTagRelationship.length === 0) {
            logger.warn("no video tag relationship to add");
            return;
          }
          videoTagRelationship.forEach(async (videoTagRelationship) => {
            await IndexedDB.addVideoTag(videoTagRelationship);
          });
        }
      } catch (error) {
        logger.error(`error while adding video: ${error}`);
      }
    })();
    return;
  }

  if (request.type === INTEGRATION_ANILIST_AUTH_CONNECT) {
    (async () => {
      const success = await authorizeAnilist(parsedPayload);
      if (success) {
        setAnilistAuthStatus("authorized", async () => {
          const tag = await IndexedDB.getTagByCode("ANILIST");

          if (!tag) {
            await IndexedDB.addTag({ name: "AniList", owner: "INTEGRATION_ANILIST" });
          }
        });
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
      expires_in: expires ? parseInt(expires) : 0,
      issued_at: Date.now(),
    };

    setAnilistAuth(anilistAuth, () => {});

    return true;
  } catch (error) {
    logger.error(`Error authorizing anilist ${error}`);
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
    await IndexedDB.openDatabase();
  })();
});

const clientId = process.env.CLIENT_ID || "";
const clientSecret = process.env.CLIENT_SECRET || "";

export async function oauth() {
  try {
    await generateUrl();
    await getRefreshToken();
  } catch (e) {
    console.error(e);
  }
}

async function generateUrl() {
  const verifier = generateRandomString(128);
  const challenge = SHA256(verifier).toString();

  const url = `${KITA_AUTH_PROXY_URL}/mal/oauth/authorize?mal_client_id=${clientId}&mal_challenge=${challenge}`;
  const redirectUrl = await launchWebAuthFlow(url);
  const code = new URL(redirectUrl ?? "").searchParams.get("code");
  localStorage.setItem("code", code || "");
}

async function getRefreshToken() {
  const code = localStorage.getItem("code");
  const challenge = localStorage.getItem("challenge");
  if (!challenge) throw new Error("Challenge not found");
  const response = await fetch(`${KITA_AUTH_PROXY_URL}/mal/oauth/token`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      mal_client_id: clientId,
      mal_client_secret: clientSecret,
      mal_code_verifier: challenge,
      mal_code: code ?? "",
    },
  });
  const result = await response.json();
  if (result && result.refresh_token && result.access_token) {
    chrome.storage.local.set(
      {
        malAccessToken: result.access_token,
        malRefreshToken: result.refresh_token,
        malTokenType: result.token_type,
        malExpiresIn: result.expires_in,
      },
      () => {
        console.log("Tokens saved");
      }
    );
    return;
  }
  if (result && result.error) throw new Error(result.error);
  throw new Error("Something went wrong");
}

(async () => {
  await oauth();
})();
