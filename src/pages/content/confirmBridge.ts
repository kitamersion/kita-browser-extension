import { SYNC_EMAIL_CONFIRMED } from "@/data/events";
import { logger } from "@kitamersion/kita-logging";

const BRIDGE_SOURCE = "kita-browser-confirm";

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window || event.origin !== window.location.origin) {
    return;
  }

  const { source, accessToken, refreshToken } = event.data ?? {};
  if (source !== BRIDGE_SOURCE || !accessToken || !refreshToken) {
    return;
  }

  const payload = JSON.stringify({ accessToken, refreshToken });
  chrome.runtime.sendMessage({ type: SYNC_EMAIL_CONFIRMED, payload }, (response) => {
    logger.info(`confirmBridge: SYNC_EMAIL_CONFIRMED message sent: ${JSON.stringify(response)}`);
  });
});
