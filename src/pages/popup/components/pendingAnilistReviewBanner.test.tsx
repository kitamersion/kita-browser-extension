import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PendingAnilistReviewBanner from "./pendingAnilistReviewBanner";
import { getPendingAnilistSyncs } from "@/api/integration/anilistPendingSync";
import { OPEN_ANILIST_PENDING_REVIEW } from "@/data/events";
import { SETTINGS } from "@/api/settings/definitions";

jest.mock("@/api/integration/anilistPendingSync", () => ({
  getPendingAnilistSyncs: jest.fn(),
}));

const mockGetPendingAnilistSyncs = getPendingAnilistSyncs as jest.Mock;

const buildEntry = (series_title: string) => ({
  id: series_title,
  video_id: series_title,
  series_title,
  source_platform: "crunchyroll" as const,
  search_results: [],
  created_at: 0,
});

const createChromeStub = () => {
  const listeners: Array<(changes: { [key: string]: chrome.storage.StorageChange }) => void> = [];
  return {
    storage: {
      onChanged: {
        addListener: jest.fn((listener) => listeners.push(listener)),
        removeListener: jest.fn((listener) => {
          const index = listeners.indexOf(listener);
          if (index >= 0) listeners.splice(index, 1);
        }),
      },
    },
    runtime: {
      sendMessage: jest.fn(),
    },
    __emitChange: (changes: { [key: string]: chrome.storage.StorageChange }) => {
      listeners.forEach((listener) => listener(changes));
    },
  };
};

let chromeStub: ReturnType<typeof createChromeStub>;

beforeEach(() => {
  jest.clearAllMocks();
  chromeStub = createChromeStub();
  (global as any).chrome = chromeStub;
});

describe("PendingAnilistReviewBanner", () => {
  test("renders nothing when there is nothing pending", async () => {
    mockGetPendingAnilistSyncs.mockResolvedValue([]);

    render(<PendingAnilistReviewBanner />);

    await waitFor(() => expect(mockGetPendingAnilistSyncs).toHaveBeenCalled());
    expect(screen.queryByText(/need review/i)).not.toBeInTheDocument();
  });

  test("shows the pending count and series names", async () => {
    mockGetPendingAnilistSyncs.mockResolvedValue([buildEntry("Dragon Ball"), buildEntry("One Piece")]);

    render(<PendingAnilistReviewBanner />);

    expect(await screen.findByText(/2 AniList matches need review/i)).toBeInTheDocument();
    expect(screen.getByText(/Dragon Ball and One Piece/)).toBeInTheDocument();
  });

  test("sends OPEN_ANILIST_PENDING_REVIEW when the review button is clicked", async () => {
    mockGetPendingAnilistSyncs.mockResolvedValue([buildEntry("Dragon Ball")]);
    render(<PendingAnilistReviewBanner />);

    const reviewButton = await screen.findByRole("button", { name: /review/i });
    await userEvent.click(reviewButton);

    expect(chromeStub.runtime.sendMessage).toHaveBeenCalledWith({ type: OPEN_ANILIST_PENDING_REVIEW });
  });

  test("refreshes when the pending sync setting changes in storage", async () => {
    mockGetPendingAnilistSyncs.mockResolvedValue([]);
    render(<PendingAnilistReviewBanner />);
    await waitFor(() => expect(mockGetPendingAnilistSyncs).toHaveBeenCalledTimes(1));

    mockGetPendingAnilistSyncs.mockResolvedValue([buildEntry("Naruto")]);
    chromeStub.__emitChange({ [SETTINGS.integrations.anilist.pendingSync.key]: { newValue: [] } });

    expect(await screen.findByText(/1 AniList match needs review/i)).toBeInTheDocument();
  });
});
