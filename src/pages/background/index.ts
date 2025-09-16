import { getAnilistConfig, getAnilistAuthUrl, setAnilistAuth, setAnilistAuthStatus, setAnilistConfig } from "@/api/integration/anilist";
import { incrementTotalVideoDuration, incrementTotalVideos } from "@/api/summaryStorage/video";
import logger from "@/config/logger";
import { INTEGRATION_ANILIST_AUTH_CONNECT, VIDEO_ADD } from "@/data/events";
import IndexedDB from "@/db/index";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";
import { MyAnimeListAuth, MyAnimeListConfig } from "@/types/integrations/myanimelist";
import { IVideoTag } from "@/types/relationship";
import { IVideo } from "@/types/video";
import { generateRandomString, generateUniqueCode } from "@/utils";
import { SHA256 } from "crypto-js";

const ENV = process.env.APPLICATION_ENVIRONMENT;

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

  // handle anilist auth connect
  if (request.type === INTEGRATION_ANILIST_AUTH_CONNECT) {
    (async () => {
      const success = await authorizeAnilist(parsedPayload as AnilistConfig);
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

  // initialize anilist config
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
