import { logger } from "@kitamersion/kita-logging";
import { runSync } from "@/api/sync/syncEngine";
import { settingsManager } from "@/api/settings/manager";
import { SETTINGS } from "@/api/settings/definitions";

export const SYNC_ALARM_NAME = "kita-cross-device-sync";

export const getNextSyncTime = (): Promise<number | null> =>
  new Promise((resolve) => {
    chrome.alarms.get(SYNC_ALARM_NAME, (alarm) => resolve(alarm?.scheduledTime ?? null));
  });

const scheduleSyncAlarm = async (): Promise<void> => {
  const periodInMinutes = await settingsManager.get(SETTINGS.kitaSync.syncIntervalMinutes);
  chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes });
};

export const initSyncAlarm = async (): Promise<void> => {
  await scheduleSyncAlarm();

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== SYNC_ALARM_NAME) return;

    runSync()
      .then((result) => {
        if (result.status === "error") logger.error(`[sync] failed: ${result.message}`);
        else logger.info(`[sync] tick finished: ${result.status}`);
      })
      .catch((error) => logger.error(`[sync] unexpected error: ${error}`))
      .finally(() => scheduleSyncAlarm());
  });
};
