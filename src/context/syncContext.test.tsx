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

const showToast = jest.fn();
jest.mock("@/context/toastNotificationContext", () => ({
  useToastContext: () => ({ showToast }),
}));

import { signIn, signUp, getSession } from "@/api/sync/auth";
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
    </div>
  );
};

describe("SyncProvider", () => {
  beforeEach(() => {
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
});
