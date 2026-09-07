import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SyncProvider, useSyncContext } from "./syncContext";

jest.mock("@/api/sync/auth", () => ({
  getSession: jest.fn().mockResolvedValue({ email: null, userId: null }),
  signUp: jest.fn().mockResolvedValue({ error: null }),
  signIn: jest.fn().mockResolvedValue({ error: null }),
  signOut: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/api/sync/quota", () => ({ getQuotaUsage: jest.fn().mockResolvedValue(null) }));
jest.mock("@/db/index", () => ({ __esModule: true, default: { getLastSyncedAt: jest.fn().mockResolvedValue(0) } }));

import { signIn, getSession } from "@/api/sync/auth";

const Consumer = () => {
  const ctx = useSyncContext();
  return (
    <div>
      <span data-testid="signed-in">{String(ctx.isSignedIn)}</span>
      <button onClick={() => ctx.signIn("a@b.com", "password123")}>sign in</button>
    </div>
  );
};

describe("SyncProvider", () => {
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
});
