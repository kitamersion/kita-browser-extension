import { settingsManager } from "@/api/settings/manager";
import { SETTINGS } from "@/api/settings/definitions";
import { PendingAnilistSync } from "@/types/integrations/seriesMapping";

export const getPendingAnilistSyncs = async (): Promise<PendingAnilistSync[]> => {
  return settingsManager.get(SETTINGS.integrations.anilist.pendingSync);
};

export const addPendingAnilistSync = async (entry: Omit<PendingAnilistSync, "id" | "created_at">): Promise<PendingAnilistSync> => {
  const existing = await getPendingAnilistSyncs();

  const newEntry: PendingAnilistSync = {
    ...entry,
    id: self.crypto.randomUUID(),
    created_at: Date.now(),
  };

  await settingsManager.set(SETTINGS.integrations.anilist.pendingSync, [...existing, newEntry]);
  return newEntry;
};

export const removePendingAnilistSync = async (id: string): Promise<void> => {
  const existing = await getPendingAnilistSyncs();
  const updated = existing.filter((entry) => entry.id !== id);
  await settingsManager.set(SETTINGS.integrations.anilist.pendingSync, updated);
};

// chrome.action is only available in extension pages/background, never in a
// content script - this is safe to call from background or any settings/popup page.
export const refreshAnilistPendingBadge = async (): Promise<void> => {
  const pending = await getPendingAnilistSyncs();
  const count = pending.length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  if (count > 0) {
    chrome.action.setBadgeBackgroundColor({ color: "#E53E3E" });
  }
};
