import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { CONFIRMATION_POLL_INTERVAL_MS, SyncProvider, useSyncContext } from "./syncContext";

jest.mock("@/api/sync/auth", () => ({
  getSession: jest.fn().mockResolvedValue({ email: null, userId: null }),
  signUp: jest.fn().mockResolvedValue({ error: null, needsEmailConfirmation: false }),
  signIn: jest.fn().mockResolvedValue({ error: null }),
  signOut: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/api/sync/quota", () => ({ getQuotaUsage: jest.fn().mockResolvedValue(null) }));
jest.mock("@/db/index", () => ({ __esModule: true, default: { getLastSyncedAt: jest.fn().mockResolvedValue(0) } }));
jest.mock("@/pages/background/syncAlarm", () => ({ getNextSyncTime: jest.fn().mockResolvedValue(null) }));
jest.mock("@/api/sync/syncEngine", () => ({ runSync: jest.fn().mockResolvedValue({ status: "ok" }) }));
jest.mock("@/api/sync/accountManagement", () => ({
  deleteAllData: jest.fn().mockResolvedValue({ error: null }),
  deleteAccount: jest.fn().mockResolvedValue({ error: null }),
  purgeExpiredTombstones: jest.fn().mockResolvedValue({ purgedCount: 0, error: null }),
}));
jest.mock("@/api/settings/manager", () => ({
  settingsManager: { get: jest.fn().mockResolvedValue(false), set: jest.fn().mockResolvedValue(undefined) },
}));

const showToast = jest.fn();
jest.mock("@/context/toastNotificationContext", () => ({
  useToastContext: () => ({ showToast }),
}));

jest.mock("@/api/eventbus", () => ({ __esModule: true, default: { publish: jest.fn() } }));

import eventBus from "@/api/eventbus";
import { VIDEO_REFRESH, TAG_REFRESH, VIDEO_TAG_RELATIONSHIP_REFRESH, AUTO_TAG_REFRESH } from "@/data/events";
import { signIn, signUp, getSession, signOut } from "@/api/sync/auth";
import { deleteAllData, deleteAccount, purgeExpiredTombstones } from "@/api/sync/accountManagement";
import { settingsManager } from "@/api/settings/manager";
import { SETTINGS } from "@/api/settings/definitions";
import { getNextSyncTime } from "@/pages/background/syncAlarm";
import { runSync } from "@/api/sync/syncEngine";

const Consumer = () => {
  const ctx = useSyncContext();
  return (
    <div>
      <span data-testid="signed-in">{String(ctx.isSignedIn)}</span>
      <span data-testid="pending-confirmation">{ctx.pendingConfirmationEmail ?? ""}</span>
      <span data-testid="next-sync-at">{ctx.nextSyncAt ?? ""}</span>
      <span data-testid="last-sync-stats">{ctx.lastSyncStats ? `${ctx.lastSyncStats.pulled}/${ctx.lastSyncStats.pushed}` : ""}</span>
      <span data-testid="is-syncing">{String(ctx.isSyncing)}</span>
      <button onClick={() => ctx.signIn("a@b.com", "password123")}>sign in</button>
      <button onClick={() => ctx.signUp("a@b.com", "password123")}>sign up</button>
      <button onClick={() => ctx.syncNow()}>sync now</button>
      <span data-testid="kita-sync-paused">{String(ctx.isKitaSyncPaused)}</span>
      <button onClick={() => ctx.pauseKitaSync()}>pause kita sync</button>
      <button onClick={() => ctx.resumeKitaSync()}>resume kita sync</button>
      <button onClick={() => ctx.deleteAllData()}>delete all data</button>
      <button onClick={() => ctx.deleteAccount()}>delete account</button>
      <button onClick={() => ctx.purgeExpiredTombstones()}>purge expired tombstones</button>
    </div>
  );
};

describe("SyncProvider", () => {
  beforeEach(() => {
    // Clear call history (but not mockResolvedValue implementations) between
    // tests. Without this, negative assertions like `.not.toHaveBeenCalledWith`
    // in the delete-data/delete-account error-path tests see calls made by an
    // earlier success-path test against the same module-level mock.
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({ email: null, userId: null });
    (getNextSyncTime as jest.Mock).mockResolvedValue(null);
    // Also reset any mockImplementation a prior test installed on settingsManager.get (e.g. the
    // pendingRekeyNotice / isKitaSyncPaused identity-keyed overrides below) back to the module's
    // default, since clearAllMocks() clears call history but not a previously-set implementation.
    (settingsManager.get as jest.Mock).mockResolvedValue(false);
  });

  test("starts signed out", async () => {
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));
  });

  test("signIn updates state to signed in on success", async () => {
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    (getSession as jest.Mock).mockResolvedValue({ email: "a@b.com", userId: "user-1" });
    fireEvent.click(screen.getByText("sign in"));

    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("true"));
    expect(signIn).toHaveBeenCalledWith("a@b.com", "password123");
  });

  test("signIn shows an error toast when credentials are invalid", async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({ error: "Invalid login credentials" });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sign in"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ status: "error", description: "Invalid login credentials" }))
    );
  });

  test("signUp sets a pending confirmation email when Supabase requires email confirmation", async () => {
    (signUp as jest.Mock).mockResolvedValueOnce({ error: null, needsEmailConfirmation: true });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sign up"));

    await waitFor(() => expect(screen.getByTestId("pending-confirmation")).toHaveTextContent("a@b.com"));
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ status: "success" }));
  });

  test("polls for a session while a confirmation is pending, and clears it once signed in", async () => {
    jest.useFakeTimers();
    (signUp as jest.Mock).mockResolvedValueOnce({ error: null, needsEmailConfirmation: true });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await act(async () => {}); // flush the initial mount's async refresh()
    expect(screen.getByTestId("signed-in")).toHaveTextContent("false");

    await act(async () => {
      fireEvent.click(screen.getByText("sign up"));
    });
    expect(screen.getByTestId("pending-confirmation")).toHaveTextContent("a@b.com");

    (getSession as jest.Mock).mockResolvedValue({ email: "a@b.com", userId: "user-1" });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(CONFIRMATION_POLL_INTERVAL_MS);
    });

    expect(screen.getByTestId("signed-in")).toHaveTextContent("true");
    expect(screen.getByTestId("pending-confirmation")).toHaveTextContent("");
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Signed in", status: "success" }));

    jest.useRealTimers();
  });

  test("shows the account-switch toast and clears the flag on mount when a background sync left it pending", async () => {
    (settingsManager.get as jest.Mock).mockImplementation((setting: unknown) => {
      if (setting === SETTINGS.kitaSync.pendingRekeyNotice) return Promise.resolve(true);
      return Promise.resolve(false);
    });

    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Signed in as a different account",
          status: "warning",
          description: "Your local data will sync as new to this account.",
        })
      )
    );
    expect(settingsManager.set).toHaveBeenCalledWith(SETTINGS.kitaSync.pendingRekeyNotice, false);
  });

  test("does not show the account-switch toast on mount when no rekey notice is pending", async () => {
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    expect(showToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Signed in as a different account" }));
  });

  test("exposes the next scheduled sync time from the alarm", async () => {
    (getNextSyncTime as jest.Mock).mockResolvedValue(1700000000000);
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("next-sync-at")).toHaveTextContent("1700000000000"));
  });

  test("syncNow runs a sync, refreshes lastSyncedAt, and shows a success toast", async () => {
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sync now"));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sync complete", status: "success" })));
    expect(runSync).toHaveBeenCalled();
    expect(screen.getByTestId("is-syncing")).toHaveTextContent("false");
  });

  test("syncNow rehydrates every data context after a successful sync", async () => {
    // Sync writes straight to IndexedDB; without this, TagContext/VideoTagRelationshipContext/
    // AutoTagContext (and VideoContext wherever it's read from cache) sit stale until a full reload.
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sync now"));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sync complete", status: "success" })));
    expect(eventBus.publish).toHaveBeenCalledWith(VIDEO_REFRESH, expect.anything());
    expect(eventBus.publish).toHaveBeenCalledWith(TAG_REFRESH, expect.anything());
    expect(eventBus.publish).toHaveBeenCalledWith(VIDEO_TAG_RELATIONSHIP_REFRESH, expect.anything());
    expect(eventBus.publish).toHaveBeenCalledWith(AUTO_TAG_REFRESH, expect.anything());
  });

  test("syncNow exposes how many rows were pulled and pushed after a successful sync", async () => {
    (runSync as jest.Mock).mockResolvedValueOnce({ status: "ok", pulled: 3, pushed: 1 });
    (settingsManager.get as jest.Mock).mockImplementation((setting: unknown) => {
      if (setting === SETTINGS.kitaSync.lastSyncStats) return Promise.resolve({ pulled: 3, pushed: 1 });
      return Promise.resolve(false);
    });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sync now"));

    await waitFor(() => expect(screen.getByTestId("last-sync-stats")).toHaveTextContent("3/1"));
  });

  test("syncNow does not rehydrate data contexts when the sync fails", async () => {
    (runSync as jest.Mock).mockResolvedValueOnce({ status: "error", message: "network error" });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sync now"));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sync failed" })));
    expect(eventBus.publish).not.toHaveBeenCalledWith(TAG_REFRESH, expect.anything());
  });

  test("syncNow shows an error toast when the sync fails", async () => {
    (runSync as jest.Mock).mockResolvedValueOnce({ status: "error", message: "network error" });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sync now"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Sync failed", status: "error", description: "network error" })
      )
    );
  });

  test("syncNow shows a distinct toast when the storage quota is exceeded", async () => {
    (runSync as jest.Mock).mockResolvedValueOnce({ status: "quota-exceeded" });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sync now"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Storage quota exceeded", status: "error" }))
    );
  });

  test("syncNow shows a distinct toast when the sync was skipped because Kita Sync is paused", async () => {
    (runSync as jest.Mock).mockResolvedValueOnce({ status: "paused" });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sync now"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Kita Sync is paused", status: "warning" }))
    );
  });

  test("syncNow shows an account-switch toast in addition to the normal result toast when data was rekeyed", async () => {
    (runSync as jest.Mock).mockResolvedValueOnce({ status: "ok", rekeyed: true });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sync now"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Signed in as a different account",
          status: "warning",
          description: "Your local data will sync as new to this account.",
        })
      )
    );
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sync complete", status: "success" }));
  });

  test("syncNow clears the pending rekey notice flag after showing its own toast, so refresh doesn't show a second one", async () => {
    (runSync as jest.Mock).mockResolvedValueOnce({ status: "ok", rekeyed: true });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("sync now"));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sync complete", status: "success" })));

    expect(settingsManager.set).toHaveBeenCalledWith(SETTINGS.kitaSync.pendingRekeyNotice, false);
    const accountSwitchToasts = showToast.mock.calls.filter((call) => call[0].title === "Signed in as a different account");
    expect(accountSwitchToasts).toHaveLength(1);
  });

  test("deleteAllData wipes data, pauses Kita Sync, and shows a success toast", async () => {
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("delete all data"));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "All data deleted", status: "success" })));
    expect(deleteAllData).toHaveBeenCalled();
    expect(settingsManager.set).toHaveBeenCalledWith(SETTINGS.kitaSync.paused, true);
    expect(signOut).not.toHaveBeenCalled();
  });

  test("deleteAllData shows an error toast and does not pause Kita Sync when the RPC fails", async () => {
    (deleteAllData as jest.Mock).mockResolvedValueOnce({ error: "permission denied" });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("delete all data"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed to delete data", status: "error", description: "permission denied" })
      )
    );
    expect(settingsManager.set).not.toHaveBeenCalledWith(SETTINGS.kitaSync.paused, true);
  });

  test("deleteAccount signs the user out and shows a success toast", async () => {
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("delete account"));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Account deleted", status: "success" })));
    expect(deleteAccount).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });

  test("deleteAccount shows an error toast and does not sign out when the RPC fails", async () => {
    (deleteAccount as jest.Mock).mockResolvedValueOnce({ error: "permission denied" });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("delete account"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed to delete account", status: "error", description: "permission denied" })
      )
    );
    expect(signOut).not.toHaveBeenCalled();
  });

  test("purgeExpiredTombstones shows how many records were cleared and refreshes", async () => {
    (purgeExpiredTombstones as jest.Mock).mockResolvedValueOnce({ purgedCount: 3, error: null });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("purge expired tombstones"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Cleared 3 expired records", status: "success" }))
    );
  });

  test("purgeExpiredTombstones shows singular wording when exactly one record was cleared", async () => {
    (purgeExpiredTombstones as jest.Mock).mockResolvedValueOnce({ purgedCount: 1, error: null });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("purge expired tombstones"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Cleared 1 expired record", status: "success" }))
    );
  });

  test("purgeExpiredTombstones shows a distinct message when there was nothing to clear", async () => {
    (purgeExpiredTombstones as jest.Mock).mockResolvedValueOnce({ purgedCount: 0, error: null });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("purge expired tombstones"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "No expired records to clear", status: "success" }))
    );
  });

  test("purgeExpiredTombstones shows an error toast when the RPC fails", async () => {
    (purgeExpiredTombstones as jest.Mock).mockResolvedValueOnce({ purgedCount: null, error: "permission denied" });
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("purge expired tombstones"));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Failed to clear expired tombstones", status: "error", description: "permission denied" })
      )
    );
  });

  test("pauseKitaSync sets the paused flag", async () => {
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("kita-sync-paused")).toHaveTextContent("false"));

    fireEvent.click(screen.getByText("pause kita sync"));

    await waitFor(() => expect(screen.getByTestId("kita-sync-paused")).toHaveTextContent("true"));
    expect(settingsManager.set).toHaveBeenCalledWith(SETTINGS.kitaSync.paused, true);
  });

  test("resumeKitaSync clears the paused flag", async () => {
    (settingsManager.get as jest.Mock).mockResolvedValue(true);
    render(
      <SyncProvider>
        <Consumer />
      </SyncProvider>
    );
    await waitFor(() => expect(screen.getByTestId("kita-sync-paused")).toHaveTextContent("true"));

    fireEvent.click(screen.getByText("resume kita sync"));

    await waitFor(() => expect(screen.getByTestId("kita-sync-paused")).toHaveTextContent("false"));
    expect(settingsManager.set).toHaveBeenCalledWith(SETTINGS.kitaSync.paused, false);
  });
});
