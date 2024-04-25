import { getAnilistConfig, setAnilistAuth, setAnilistConfig } from "@/api/integration/anilist";
import { INTEGRATION_ANILIST_AUTH, VIDEO_ADD } from "@/data/events";
import IndexedDB from "@/db/index";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";

export type RuntimeResponse = {
  status: RuntimeStatus;
  message: string;
};

type RuntimeStatus = "error" | "success" | "unknown";

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
    console.log("Received ADD_VIDEO with payload:", parsedPayload);
    IndexedDB.addVideo(parsedPayload).then(() => {
      // @todo handle failure
      const response: RuntimeResponse = { status: "success", message: "video added successfully" };
      sendResponse(response);
    });
    return;
  }

  if (request.type === INTEGRATION_ANILIST_AUTH) {
    console.log("Received GET_VIDEO with payload:", parsedPayload);
    const hasCompleteAuth = authorizeAnilist(parsedPayload as AnilistConfig);
    // @todo handle failure
    const response: RuntimeResponse = { status: "unknown", message: "" };
    if (hasCompleteAuth) {
      response.status = "success";
      response.message = "anilist authorization successful";
    } else {
      response.status = "error";
      response.message = "anilist authorization failed";
    }

    sendResponse(response);
  }
});

(() => {
  const redirectUrl = chrome.identity.getRedirectURL("callback");

  getAnilistConfig((config) => {
    if (!config) {
      setAnilistConfig({ anilistId: "", secret: "", redirectUrl: redirectUrl }, () => {
        console.log("anilist config initialized");
      });
    }
  });
})();

const authorizeAnilist = (anilistConfig: AnilistConfig): boolean => {
  const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${anilistConfig.anilistId}&response_type=token`;

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true,
    },
    (redirectUrl) => {
      if (chrome.runtime.lastError) {
        console.log(chrome.runtime.lastError.message);
        return;
      }

      // Extract the access token from the URL
      const url = new URL(redirectUrl ?? "");
      console.log("URL:", url);
      const params = new URLSearchParams(url.hash.substring(1)); // Remove the leading '#'
      const accessToken = params.get("access_token");
      const expires = params.get("expires_in");
      const tokenType = params.get("token_type");
      console.log("Access token:", accessToken);

      const anilistAuth: AnilistAuth = {
        access_token: accessToken ?? "",
        token_type: tokenType ?? "",
        expires_in: parseInt(expires ?? "0"),
      };

      setAnilistAuth(anilistAuth, (data) => {
        console.log("Anilist auth saved", data);
      });
      return true;
    }
  );
  return false;
};
