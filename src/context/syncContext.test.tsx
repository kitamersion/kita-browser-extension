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

const showToast = jest.fn();
jest.mock("@/context/toastNotificationContext", () => ({
  useToastContext: () => ({ showToast }),
}));

import { signIn, signUp, getSession } from "@/api/sync/auth";

const Consumer = () => {
  const ctx = useSyncContext();
  return (
    <div>
      <span data-testid="signed-in">{String(ctx.isSignedIn)}</span>
      <span data-testid="pending-confirmation">{ctx.pendingConfirmationEmail ?? ""}</span>
      <button onClick={() => ctx.signIn("a@b.com", "password123")}>sign in</button>
      <button onClick={() => ctx.signUp("a@b.com", "password123")}>sign up</button>
    </div>
  );
};

describe("SyncProvider", () => {
  beforeEach(() => {
    (getSession as jest.Mock).mockResolvedValue({ email: null, userId: null });
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
});
