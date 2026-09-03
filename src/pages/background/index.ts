import { getAnilistConfig, getAnilistAuthUrl, setAnilistAuth, setAnilistAuthStatus, setAnilistConfig } from "@/api/integration/anilist";
import { incrementTotalVideoDuration, incrementTotalVideos } from "@/api/summaryStorage/video";
import { logger } from "@kitamersion/kita-logging";
import { INTEGRATION_ANILIST_AUTH_CONNECT, OPEN_ANILIST_PENDING_REVIEW, VIDEO_ADD } from "@/data/events";
import IndexedDB from "@/db/index";
import { AnilistConfig } from "@/types/integrations/anilist";
import { IVideoTag } from "@/types/relationship";
import { IVideo } from "@/types/video";
import { generateUniqueCode, parseAnilistAuthFromRedirectUrl } from "@/utils";
import { attemptAnilistAutoSync } from "./anilistAutoSync";

export type RuntimeResponse = {
  status: RuntimeStatus;
  message: string;
};

type RuntimeStatus = "error" | "success" | "unknown";

// EVENT HANDLERS
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type !== VIDEO_ADD && request.type !== INTEGRATION_ANILIST_AUTH_CONNECT) {
    return;
  }

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
    logger.info("received VIDEO_ADD event");
    const { id, video_title, origin, video_duration } = parsedPayload as IVideo;
    const uniqueCode = generateUniqueCode(video_title, origin);

    try {
      // MV3 service workers are torn down when idle; the message that wakes this one
      // back up can arrive before the module-level openDatabase() IIFE has resolved,
      // leaving this.db null. Awaiting it here guarantees the connection is ready.
      await IndexedDB.openDatabase();

      const hasExistingVideoItem = await IndexedDB.getVideoByUniqueCode(uniqueCode);
      if (hasExistingVideoItem) {
        logger.info("video already exists, skipping...");
        const response: RuntimeResponse = { status: "success", message: "video already exists" };
        sendResponse(response);
        return;
      }

      // apply auto tags
      const autoTag = await IndexedDB.getAutoTagByOrigin(origin);
      if (autoTag) {
        parsedPayload.tags = autoTag.tags;
      }

      const newVideo: IVideo = { ...parsedPayload, unique_code: uniqueCode };
      await IndexedDB.addVideo(newVideo);
      incrementTotalVideos();
      incrementTotalVideoDuration(video_duration ?? 0);
      attemptAnilistAutoSync(newVideo);

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
          const response: RuntimeResponse = { status: "success", message: "video added, no tags to attach" };
          sendResponse(response);
          return;
        }
        videoTagRelationship.forEach(async (videoTagRelationship) => {
          await IndexedDB.addVideoTag(videoTagRelationship);
        });
      }

      const response: RuntimeResponse = { status: "success", message: "video added" };
      sendResponse(response);
    } catch (error) {
      logger.error(`error while adding video: ${error}`);
      const response: RuntimeResponse = { status: "error", message: `error while adding video: ${error}` };
      sendResponse(response);
    }

    return;
  }

  // handle anilist auth connect
  if (request.type === INTEGRATION_ANILIST_AUTH_CONNECT) {
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
    const anilistAuth = parseAnilistAuthFromRedirectUrl(redirectUrl ?? "");

    if (!anilistAuth) {
      logger.error("No access token found in redirect URL");
      return false;
    }

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

// content scripts can't call chrome.tabs themselves, so they message the
// background to open settings on the Auto Track tab's pending review list.
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === OPEN_ANILIST_PENDING_REVIEW) {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings.html?tab=autotrack") });
  }
});
