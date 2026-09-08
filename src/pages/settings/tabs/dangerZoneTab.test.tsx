import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DangerZoneTab from "./dangerZoneTab";
import { useSyncContext } from "@/context/syncContext";

jest.mock("@/context/syncContext");

const baseContext = {
  isSignedIn: true,
  isKitaSyncPaused: false,
  resumeKitaSync: jest.fn(),
  deleteAllData: jest.fn().mockResolvedValue({ error: null }),
  deleteAccount: jest.fn().mockResolvedValue({ error: null }),
};

describe("DangerZoneTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows a signed-out message instead of destructive actions when signed out", () => {
    (useSyncContext as jest.Mock).mockReturnValue({ ...baseContext, isSignedIn: false });

    render(<DangerZoneTab />);

    expect(screen.getByTestId("danger-zone-signed-out")).toBeInTheDocument();
    expect(screen.queryByTestId("open-delete-data-button")).not.toBeInTheDocument();
  });

  test("shows a resume control when Kita Sync is paused", () => {
    (useSyncContext as jest.Mock).mockReturnValue({ ...baseContext, isKitaSyncPaused: true });

    render(<DangerZoneTab />);
    fireEvent.click(screen.getByText("Resume Kita Sync"));

    expect(baseContext.resumeKitaSync).toHaveBeenCalled();
  });

  test("delete all data only runs after confirming in the modal", async () => {
    (useSyncContext as jest.Mock).mockReturnValue(baseContext);

    render(<DangerZoneTab />);
    expect(baseContext.deleteAllData).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("open-delete-data-button"));
    fireEvent.click(screen.getByTestId("confirm-delete-data-button"));

    await waitFor(() => expect(baseContext.deleteAllData).toHaveBeenCalled());
  });

  test("delete-all-data modal stays open when deleteAllData fails", async () => {
    const failingDeleteAllData = jest.fn().mockResolvedValue({ error: "permission denied" });
    (useSyncContext as jest.Mock).mockReturnValue({
      ...baseContext,
      deleteAllData: failingDeleteAllData,
    });

    render(<DangerZoneTab />);
    fireEvent.click(screen.getByTestId("open-delete-data-button"));
    fireEvent.click(screen.getByTestId("confirm-delete-data-button"));

    await waitFor(() => expect(failingDeleteAllData).toHaveBeenCalled());
    expect(screen.getByText("Delete all data?")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-delete-data-button")).toBeInTheDocument();
  });

  test("cancelling the delete-all-data modal does not call deleteAllData", () => {
    (useSyncContext as jest.Mock).mockReturnValue(baseContext);

    render(<DangerZoneTab />);
    fireEvent.click(screen.getByTestId("open-delete-data-button"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(baseContext.deleteAllData).not.toHaveBeenCalled();
  });

  test('delete account button stays disabled until "delete" is typed', () => {
    (useSyncContext as jest.Mock).mockReturnValue(baseContext);

    render(<DangerZoneTab />);
    fireEvent.click(screen.getByTestId("open-delete-account-button"));

    expect(screen.getByTestId("confirm-delete-account-button")).toBeDisabled();

    fireEvent.change(screen.getByTestId("delete-account-confirm-input"), { target: { value: "not delete" } });
    expect(screen.getByTestId("confirm-delete-account-button")).toBeDisabled();

    fireEvent.change(screen.getByTestId("delete-account-confirm-input"), { target: { value: "DELETE" } });
    expect(screen.getByTestId("confirm-delete-account-button")).not.toBeDisabled();
  });

  test("delete account runs once confirmed with the typed phrase", async () => {
    (useSyncContext as jest.Mock).mockReturnValue(baseContext);

    render(<DangerZoneTab />);
    fireEvent.click(screen.getByTestId("open-delete-account-button"));
    fireEvent.change(screen.getByTestId("delete-account-confirm-input"), { target: { value: "delete" } });
    fireEvent.click(screen.getByTestId("confirm-delete-account-button"));

    await waitFor(() => expect(baseContext.deleteAccount).toHaveBeenCalled());
  });
});
