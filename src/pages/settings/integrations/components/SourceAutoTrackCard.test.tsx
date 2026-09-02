import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SourceAutoTrackCard from "./SourceAutoTrackCard";
import { useAnilistContext } from "@/context/anilistContext";
import { getSourceAutoSyncConfig, getSourceAutoTrackConfig, setSourceAutoSyncConfig, setSourceAutoTrackConfig } from "@/api/sourceTracking";

// Explicit factories so jest never has to load (and side-effect through) the real
// modules just to build automocks - anilistContext transitively pulls in IndexedDB.
jest.mock("@/context/anilistContext", () => ({
  useAnilistContext: jest.fn(),
}));
jest.mock("@/api/sourceTracking", () => ({
  getSourceAutoTrackConfig: jest.fn(),
  setSourceAutoTrackConfig: jest.fn(),
  getSourceAutoSyncConfig: jest.fn(),
  setSourceAutoSyncConfig: jest.fn(),
}));

const mockUseAnilistContext = useAnilistContext as jest.Mock;
const mockGetSourceAutoTrackConfig = getSourceAutoTrackConfig as jest.Mock;
const mockSetSourceAutoTrackConfig = setSourceAutoTrackConfig as jest.Mock;
const mockGetSourceAutoSyncConfig = getSourceAutoSyncConfig as jest.Mock;
const mockSetSourceAutoSyncConfig = setSourceAutoSyncConfig as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSourceAutoTrackConfig.mockResolvedValue({ enabled: false, watchPercentage: 80 });
  mockGetSourceAutoSyncConfig.mockResolvedValue({ enabled: false });
});

describe("SourceAutoTrackCard - auto-track (local, ungated)", () => {
  test("the auto-track toggle is interactive even when AniList isn't connected", async () => {
    mockUseAnilistContext.mockReturnValue({ anilistIsAuthorized: false });

    render(<SourceAutoTrackCard platform="crunchyroll" title="Crunchyroll" icon={<span />} />);

    const toggle = await screen.findByRole("checkbox", { name: /toggle auto-track for crunchyroll/i });
    expect(toggle).not.toBeDisabled();

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockSetSourceAutoTrackConfig).toHaveBeenCalledWith("crunchyroll", { enabled: true, watchPercentage: 80 });
    });
  });

  test("changing the percentage input saves the new watch percentage", async () => {
    mockUseAnilistContext.mockReturnValue({ anilistIsAuthorized: false });
    mockGetSourceAutoTrackConfig.mockResolvedValue({ enabled: true, watchPercentage: 80 });

    render(<SourceAutoTrackCard platform="crunchyroll" title="Crunchyroll" icon={<span />} />);

    const percentageInput = await screen.findByRole("spinbutton");
    fireEvent.change(percentageInput, { target: { value: "50" } });

    await waitFor(() => {
      expect(mockSetSourceAutoTrackConfig).toHaveBeenCalledWith("crunchyroll", { enabled: true, watchPercentage: 50 });
    });
  });
});

describe("SourceAutoTrackCard - auto-sync (push to integrations, gated)", () => {
  test("the auto-sync toggle is off and disabled when AniList isn't connected", async () => {
    mockUseAnilistContext.mockReturnValue({ anilistIsAuthorized: false });

    render(<SourceAutoTrackCard platform="crunchyroll" title="Crunchyroll" icon={<span />} />);

    const syncToggle = await screen.findByRole("checkbox", { name: /toggle auto-sync for crunchyroll/i });
    expect(syncToggle).toBeDisabled();
    expect(syncToggle).not.toBeChecked();
    expect(screen.getByText(/connect anilist/i)).toBeInTheDocument();
  });

  test("toggling auto-sync saves the flipped state once AniList is connected", async () => {
    mockUseAnilistContext.mockReturnValue({ anilistIsAuthorized: true });

    render(<SourceAutoTrackCard platform="crunchyroll" title="Crunchyroll" icon={<span />} />);

    const syncToggle = await screen.findByRole("checkbox", { name: /toggle auto-sync for crunchyroll/i });
    expect(syncToggle).not.toBeDisabled();
    fireEvent.click(syncToggle);

    await waitFor(() => {
      expect(mockSetSourceAutoSyncConfig).toHaveBeenCalledWith("crunchyroll", { enabled: true });
    });
  });

  test("does not render the auto-sync section when the source doesn't support syncing", async () => {
    mockUseAnilistContext.mockReturnValue({ anilistIsAuthorized: true });

    render(<SourceAutoTrackCard platform="youtube" title="YouTube" icon={<span />} supportsAutoSync={false} />);

    await screen.findByRole("checkbox", { name: /toggle auto-track for youtube/i });
    expect(screen.queryByRole("checkbox", { name: /toggle auto-sync for youtube/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/connect anilist/i)).not.toBeInTheDocument();
  });
});
