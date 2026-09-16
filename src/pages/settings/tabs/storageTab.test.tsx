import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import StorageTab from "./storageTab";
import * as storageUsageApi from "@/api/storageUsage";

jest.mock("@/api/storageUsage");

const mockApi = storageUsageApi as jest.Mocked<typeof storageUsageApi>;

describe("StorageTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows a loading state before the summary resolves", () => {
    mockApi.getStorageUsageSummary.mockReturnValue(new Promise(() => {}));

    render(<StorageTab />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test("renders the total and every bucket once the summary loads", async () => {
    mockApi.getStorageUsageSummary.mockResolvedValue({
      totalBytes: 1024 * 1024 * 3,
      buckets: [
        { name: "Videos & Tags", bytes: 1024 * 512 },
        { name: "AniList Cache", bytes: 1024 * 256 },
        { name: "Other", bytes: 1024 },
      ],
    });

    render(<StorageTab />);

    await waitFor(() => expect(screen.getByTestId("storage-total")).toBeInTheDocument());

    expect(screen.getByTestId("storage-total")).toHaveTextContent("3.00 MB");
    expect(screen.getByTestId("storage-bucket-Videos & Tags")).toHaveTextContent("Videos & Tags");
    expect(screen.getByTestId("storage-bucket-Videos & Tags")).toHaveTextContent("512.0 KB");
    expect(screen.getByTestId("storage-bucket-AniList Cache")).toHaveTextContent("256.0 KB");
    expect(screen.getByTestId("storage-bucket-Other")).toHaveTextContent("1.0 KB");
  });

  test("shows an error state when the summary fails to load", async () => {
    mockApi.getStorageUsageSummary.mockRejectedValue(new Error("boom"));

    render(<StorageTab />);

    await waitFor(() => expect(screen.getByTestId("storage-error")).toBeInTheDocument());
  });
});
