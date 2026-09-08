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
}));
jest.mock("@/api/settings/manager", () => ({
  settingsManager: { get: jest.fn().mockResolvedValue(false), set: jest.fn().mockResolvedValue(undefined) },
}));

const showToast = jest.fn();
jest.mock("@/context/toastNotificationContext", () => ({
  useToastContext: () => ({ showToast }),
}));

import { signIn, signUp, getSession, signOut } from "@/api/sync/auth";
import { deleteAllData, deleteAccount } from "@/api/sync/accountManagement";
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
      <span data-testid="is-syncing">{String(ctx.isSyncing)}</span>
      <button onClick={() => ctx.signIn("a@b.com", "password123")}>sign in</button>
      <button onClick={() => ctx.signUp("a@b.com", "password123")}>sign up</button>
      <button onClick={() => ctx.syncNow()}>sync now</button>
      <span data-testid="kita-sync-paused">{String(ctx.isKitaSyncPaused)}</span>
      <button onClick={() => ctx.resumeKitaSync()}>resume kita sync</button>
      <button onClick={() => ctx.deleteAllData()}>delete all data</button>
      <button onClick={() => ctx.deleteAccount()}>delete account</button>
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
