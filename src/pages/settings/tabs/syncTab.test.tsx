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

  test("shows a hobby-project disclaimer banner when signed out", () => {
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

    expect(screen.getByTestId("sync-disclaimer-banner")).toHaveTextContent(/hobby project/i);
    expect(screen.getByTestId("sync-disclaimer-banner")).toHaveTextContent(/2\s*MB/i);
    expect(screen.getByTestId("sync-disclaimer-banner")).toHaveTextContent(/delete your account/i);
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
      quota: { currentBytes: 1048576, maxBytes: 5242880, lastSyncedAt: Date.now(), dataRetentionDays: 90 },
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

  test("shows pulled/pushed stats from the last sync when signed in", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: null,
      lastSyncedAt: 0,
      nextSyncAt: null,
      lastSyncStats: { pulled: 7, pushed: 2 },
      isSyncing: false,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-pulled-stat")).toHaveTextContent("7");
    expect(screen.getByTestId("sync-pushed-stat")).toHaveTextContent("2");
  });

  test("shows a placeholder for pulled/pushed stats before any sync has completed", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: null,
      lastSyncedAt: 0,
      nextSyncAt: null,
      lastSyncStats: null,
      isSyncing: false,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-pulled-stat")).toHaveTextContent("—");
    expect(screen.getByTestId("sync-pushed-stat")).toHaveTextContent("—");
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

  test("clears the email/password fields after signing out", () => {
    const signOut = jest.fn();
    const baseProps = {
      isInitialized: true,
      email: null,
      quota: null,
      lastSyncedAt: 0,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut,
    };

    (useSyncContext as jest.Mock).mockReturnValue({ ...baseProps, isSignedIn: false });
    const { rerender } = render(<SyncTab />);

    fireEvent.change(screen.getByTestId("sync-email-input"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByTestId("sync-password-input"), { target: { value: "password123" } });

    (useSyncContext as jest.Mock).mockReturnValue({
      ...baseProps,
      isSignedIn: true,
      email: "a@b.com",
      nextSyncAt: null,
      isSyncing: false,
      syncNow: jest.fn(),
    });
    rerender(<SyncTab />);

    fireEvent.click(screen.getByTestId("sync-sign-out-button"));
    expect(signOut).toHaveBeenCalled();

    (useSyncContext as jest.Mock).mockReturnValue({ ...baseProps, isSignedIn: false });
    rerender(<SyncTab />);

    expect(screen.getByTestId("sync-email-input")).toHaveValue("");
    expect(screen.getByTestId("sync-password-input")).toHaveValue("");
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

  test("shows a pause control that pauses Kita Sync when it's running", () => {
    const pauseKitaSync = jest.fn();
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: null,
      lastSyncedAt: 0,
      nextSyncAt: null,
      isSyncing: false,
      error: null,
      isKitaSyncPaused: false,
      pauseKitaSync,
      resumeKitaSync: jest.fn(),
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow: jest.fn(),
    });

    render(<SyncTab />);
    fireEvent.click(screen.getByTestId("sync-toggle-kita-sync-button"));

    expect(screen.getByTestId("sync-toggle-kita-sync-button")).toHaveTextContent("Pause Kita Sync");
    expect(pauseKitaSync).toHaveBeenCalled();
  });

  test("shows the sync interval and lets the user change it", () => {
    const setSyncIntervalMinutes = jest.fn();
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: null,
      lastSyncedAt: 0,
      nextSyncAt: null,
      isSyncing: false,
      error: null,
      isKitaSyncPaused: false,
      pauseKitaSync: jest.fn(),
      resumeKitaSync: jest.fn(),
      syncIntervalMinutes: 15,
      setSyncIntervalMinutes,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-interval-trigger")).toHaveTextContent("Every 15 minutes");
    fireEvent.click(screen.getByTestId("sync-interval-trigger"));
    fireEvent.click(screen.getByTestId("sync-interval-option-720"));

    expect(setSyncIntervalMinutes).toHaveBeenCalledWith(720);
  });

  test("shows a resume control that resumes Kita Sync when it's paused", () => {
    const resumeKitaSync = jest.fn();
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: null,
      lastSyncedAt: 0,
      nextSyncAt: null,
      isSyncing: false,
      error: null,
      isKitaSyncPaused: true,
      pauseKitaSync: jest.fn(),
      resumeKitaSync,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow: jest.fn(),
    });

    render(<SyncTab />);
    fireEvent.click(screen.getByTestId("sync-toggle-kita-sync-button"));

    expect(screen.getByTestId("sync-toggle-kita-sync-button")).toHaveTextContent("Resume Kita Sync");
    expect(resumeKitaSync).toHaveBeenCalled();
  });

  test("shows a quiet retention notice when deletion is not imminent", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: { currentBytes: 1234, maxBytes: 5242880, lastSyncedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, dataRetentionDays: 90 },
      lastSyncedAt: 0,
      nextSyncAt: null,
      isSyncing: false,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-retention-notice")).toHaveTextContent("80 days remaining");
    expect(screen.getByTestId("sync-retention-notice")).not.toHaveAttribute("role", "alert");
  });

  test("escalates to an alert when deletion is within 14 days", () => {
    (useSyncContext as jest.Mock).mockReturnValue({
      isInitialized: true,
      isSignedIn: true,
      email: "a@b.com",
      quota: { currentBytes: 1234, maxBytes: 5242880, lastSyncedAt: Date.now() - 84 * 24 * 60 * 60 * 1000, dataRetentionDays: 90 },
      lastSyncedAt: 0,
      nextSyncAt: null,
      isSyncing: false,
      error: null,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      syncNow: jest.fn(),
    });

    render(<SyncTab />);

    expect(screen.getByTestId("sync-retention-notice")).toHaveTextContent("6 days");
    expect(screen.getByTestId("sync-retention-notice")).toHaveAttribute("role", "alert");
  });
});
