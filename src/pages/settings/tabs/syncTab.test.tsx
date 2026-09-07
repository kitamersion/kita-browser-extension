import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SyncTab from "./syncTab";
import { useSyncContext } from "@/context/syncContext";

jest.mock("@/context/syncContext");

describe("SyncTab", () => {
  test("shows sign up/sign in forms when signed out", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: false,
      email: null,
      quota: null,
      lastSyncedAt: 0,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("sync-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("sync-sign-in-button")).toBeInTheDocument();
    expect(screen.getByTestId("sync-sign-up-button")).toBeInTheDocument();
  });

  test("submitting sign in calls context signIn with the entered credentials", () => {
    const signIn = jest.fn();
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: false,
      email: null,
      quota: null,
      lastSyncedAt: 0,
      error: null,
      signUp: jest.fn(),
      signIn,
      signOut: jest.fn(),
    });

    render(<SyncTab />);
    fireEvent.change(screen.getByTestId("sync-email-input"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByTestId("sync-password-input"), { target: { value: "password123" } });
    fireEvent.click(screen.getByTestId("sync-sign-in-button"));

    expect(signIn).toHaveBeenCalledWith("a@b.com", "password123");
  });

  test("shows status and quota usage when signed in", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: { currentBytes: 1048576, maxBytes: 5242880 },
      lastSyncedAt: 1700000000000,
      nextSyncAt: null,
      isSyncing: false,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-signed-in")).toHaveTextContent("a@b.com");
    expect(screen.getByTestId("sync-sign-out-button")).toBeInTheDocument();
    expect(screen.queryByTestId("sync-email-input")).not.toBeInTheDocument();
  });

  test("shows the next scheduled sync time when signed in", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: null,
      lastSyncedAt: 0,
      nextSyncAt: new Date("2024-01-01T00:15:00.000Z").getTime(),
      isSyncing: false,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-next-sync-at")).toHaveTextContent(new Date("2024-01-01T00:15:00.000Z").toLocaleString());
  });

  test("sync now button calls syncNow when clicked", () => {
    const syncNow = jest.fn();
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: null,
      lastSyncedAt: 0,
      nextSyncAt: null,
      isSyncing: false,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow,
    });

    render(<SyncTab />);
    fireEvent.click(screen.getByTestId("sync-now-button"));

    expect(syncNow).toHaveBeenCalled();
  });

  test("sync now button disables while a sync is in flight", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: null,
      lastSyncedAt: 0,
      nextSyncAt: null,
      isSyncing: true,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-now-button")).toBeDisabled();
  });

  test("shows an error message when auth fails", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: false,
      email: null,
      quota: null,
      lastSyncedAt: 0,
      error: "Invalid login credentials",
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(<SyncTab />);
    expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
  });

  test("disables sign in and sign up buttons while a request is in flight", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: false,
      email: null,
      quota: null,
      lastSyncedAt: 0,
      error: null,
      isSubmitting: true,
      pendingConfirmationEmail: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-sign-in-button")).toBeDisabled();
    expect(screen.getByTestId("sync-sign-up-button")).toBeDisabled();
  });

  test("shows a waiting message when a signup is pending email confirmation", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: false,
      email: null,
      quota: null,
      lastSyncedAt: 0,
      error: null,
      isSubmitting: false,
      pendingConfirmationEmail: "a@b.com",
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-pending-confirmation")).toHaveTextContent("a@b.com");
    expect(screen.queryByTestId("sync-email-input")).not.toBeInTheDocument();
  });
});
