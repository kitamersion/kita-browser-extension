import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import CacheTab from "./cacheTab";
import * as anilistCacheApi from "@/api/anilistCache";
import { AniListCacheCategorySummary } from "@/api/anilistCache";
import db from "@/db";

// Declared with a "mock" prefix so babel-plugin-jest-hoist allows referencing
// them from inside the hoisted jest.mock() factory below. Only assigned to
// once (jest.fn()) at module scope; per-test behavior is layered on with
// mockResolvedValueOnce/mockRejectedValueOnce, which run long after this
// module body (and therefore the jest.mock factories) have executed.
const mockRefetchProfile = jest.fn();
const mockFetchAnimeList = jest.fn();

jest.mock("@/api/anilistCache");
jest.mock("@/db", () => ({ __esModule: true, default: { setAniListCache: jest.fn() } }));
jest.mock("@apollo/client", () => ({
  ...jest.requireActual("@apollo/client"),
  useApolloClient: () => ({ query: jest.fn() }),
}));
jest.mock("@/graphql", () => ({
  ...jest.requireActual("@/graphql"),
  useGetMeQuery: () => ({ refetch: mockRefetchProfile }),
  useGetUserAnimeListLazyQuery: () => [mockFetchAnimeList],
}));
jest.mock("./components/cache/seriesMappingSummaryCard", () => {
  const MockSeriesMappingSummaryCard = () => <div data-testid="series-mapping-summary-stub" />;
  return MockSeriesMappingSummaryCard;
});

const mockApi = anilistCacheApi as jest.Mocked<typeof anilistCacheApi>;
const mockSetAniListCache = db.setAniListCache as jest.Mock;
// Matches PROFILE_LIST_CACHE_TTL_MS in cacheTab.tsx (mirrors ANILIST_CACHE_TTL
// in anilistProfile.tsx, which owns the "profile" cache key this page refreshes).
const PROFILE_LIST_CACHE_TTL_MS = 10 * 60 * 1000;

const emptySummaries: AniListCacheCategorySummary[] = [
  { category: "profile", label: "Profile", entries: [], totalSizeBytes: 0 },
  { category: "lists", label: "Anime Lists", entries: [], totalSizeBytes: 0 },
  { category: "collections", label: "Genre/Tag Collections", entries: [], totalSizeBytes: 0 },
  { category: "search", label: "Search Results", entries: [], totalSizeBytes: 0 },
  { category: "other", label: "Other", entries: [], totalSizeBytes: 0 },
];

describe("CacheTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetchProfile.mockReset();
    mockFetchAnimeList.mockReset();
    mockApi.getCategorizedCacheEntries.mockResolvedValue(emptySummaries);
  });

  test("renders every category section and the series mapping summary", async () => {
    render(<CacheTab />);

    await waitFor(() => expect(screen.getByTestId("cache-category-profile")).toBeInTheDocument());
    expect(screen.getByTestId("cache-category-lists")).toBeInTheDocument();
    expect(screen.getByTestId("cache-category-collections")).toBeInTheDocument();
    expect(screen.getByTestId("cache-category-search")).toBeInTheDocument();
    expect(screen.getByTestId("cache-category-other")).toBeInTheDocument();
    expect(screen.getByTestId("series-mapping-summary-stub")).toBeInTheDocument();
  });

  test("clear-all button is disabled when there is nothing cached", async () => {
    render(<CacheTab />);
    await waitFor(() => expect(screen.getByTestId("open-clear-all-button")).toBeDisabled());
  });

  test("clear all requires typing CLEAR before confirming, then calls clearAllCache", async () => {
    mockApi.getCategorizedCacheEntries.mockResolvedValue([
      { ...emptySummaries[0], entries: [{ key: "profile", value: {}, expires_at: Date.now() + 60_000, sizeBytes: 2 }] },
      ...emptySummaries.slice(1),
    ]);
    mockApi.clearAllCache.mockResolvedValue(undefined);

    render(<CacheTab />);
    await waitFor(() => expect(screen.getByTestId("open-clear-all-button")).not.toBeDisabled());

    fireEvent.click(screen.getByTestId("open-clear-all-button"));
    expect(screen.getByTestId("confirm-clear-all-button")).toBeDisabled();

    fireEvent.change(screen.getByTestId("clear-all-confirm-input"), { target: { value: "CLEAR" } });
    expect(screen.getByTestId("confirm-clear-all-button")).not.toBeDisabled();

    fireEvent.click(screen.getByTestId("confirm-clear-all-button"));
    await waitFor(() => expect(mockApi.clearAllCache).toHaveBeenCalled());
  });

  test("deleting an entry calls deleteCacheEntry and reloads categories", async () => {
    mockApi.getCategorizedCacheEntries.mockResolvedValue([
      { ...emptySummaries[0], entries: [{ key: "profile", value: { name: "Ada" }, expires_at: Date.now() + 60_000, sizeBytes: 2 }] },
      ...emptySummaries.slice(1),
    ]);
    mockApi.deleteCacheEntry.mockResolvedValue(undefined);

    render(<CacheTab />);
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("cache-entry-delete-profile"));

    await waitFor(() => expect(mockApi.deleteCacheEntry).toHaveBeenCalledWith("profile"));
    expect(mockApi.getCategorizedCacheEntries).toHaveBeenCalledTimes(2);
  });

  // Chakra's useToast() only renders into the DOM when a <ChakraProvider> is
  // present in the tree (confirmed by spiking it locally without one — the
  // toast() call doesn't throw, but nothing appears in the document). None of
  // the other tests above need toast text, so they render CacheTab bare; these
  // two do, so they wrap it in ChakraProvider instead.
  const seedProfileEntry = () =>
    mockApi.getCategorizedCacheEntries.mockResolvedValue([
      { ...emptySummaries[0], entries: [{ key: "profile", value: { name: "Ada" }, expires_at: Date.now() + 60_000, sizeBytes: 2 }] },
      ...emptySummaries.slice(1),
    ]);

  test("refreshing the profile entry succeeds: caches the fresh data and shows a success toast", async () => {
    seedProfileEntry();
    mockRefetchProfile.mockResolvedValueOnce({ data: { Viewer: { id: 1, name: "Fresh Ada" } } });

    render(
      <ChakraProvider>
        <CacheTab />
      </ChakraProvider>
    );
    await waitFor(() => expect(screen.getByTestId("cache-entry-refresh-profile")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("cache-entry-refresh-profile"));

    await waitFor(() =>
      expect(mockSetAniListCache).toHaveBeenCalledWith("profile", { id: 1, name: "Fresh Ada" }, PROFILE_LIST_CACHE_TTL_MS)
    );
    await waitFor(() => expect(screen.getByText("Profile refreshed")).toBeInTheDocument());
    expect(screen.queryByText("Failed to refresh profile")).not.toBeInTheDocument();
    expect(mockApi.getCategorizedCacheEntries).toHaveBeenCalledTimes(2);
  });

  test("refreshing the profile entry fails: shows an error toast and does not crash", async () => {
    seedProfileEntry();
    mockRefetchProfile.mockRejectedValueOnce(new Error("network error"));

    render(
      <ChakraProvider>
        <CacheTab />
      </ChakraProvider>
    );
    await waitFor(() => expect(screen.getByTestId("cache-entry-refresh-profile")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("cache-entry-refresh-profile"));

    await waitFor(() => expect(screen.getByText("Failed to refresh profile")).toBeInTheDocument());
    expect(mockSetAniListCache).not.toHaveBeenCalled();
    expect(screen.getByTestId("cache-entry-refresh-profile")).not.toBeDisabled();
  });
});
