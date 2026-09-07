import { logger } from "@kitamersion/kita-logging";
import { runSync } from "@/api/sync/syncEngine";

export const SYNC_ALARM_NAME = "kita-cross-device-sync";
const SYNC_INTERVAL_MINUTES = 15;

export const initSyncAlarm = (): void => {
  chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== SYNC_ALARM_NAME) return;

    runSync()
      .then((result) => {
        if (result.status === "error") logger.error(`[sync] failed: ${result.message}`);
        else logger.info(`[sync] tick finished: ${result.status}`);
      })
      .catch((error) => logger.error(`[sync] unexpected error: ${error}`));
  });
};
