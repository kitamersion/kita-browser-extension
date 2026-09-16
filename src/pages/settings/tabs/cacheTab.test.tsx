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
const mockClientQuery = jest.fn();

jest.mock("@/api/anilistCache");
jest.mock("@/db", () => ({ __esModule: true, default: { setAniListCache: jest.fn() } }));
jest.mock("@apollo/client", () => ({
  ...jest.requireActual("@apollo/client"),
  useApolloClient: () => ({ query: mockClientQuery }),
}));
jest.mock("@/graphql", () => ({
  ...jest.requireActual("@/graphql"),
  useGetMeQuery: () => ({ refetch: mockRefetchProfile }),
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
    mockClientQuery.mockReset();
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

  const seedListEntry = () =>
    mockApi.getCategorizedCacheEntries.mockResolvedValue([
      emptySummaries[0],
      {
        ...emptySummaries[1],
        entries: [{ key: "list:42:CURRENT", value: {}, expires_at: Date.now() + 60_000, sizeBytes: 2 }],
      },
      ...emptySummaries.slice(2),
    ]);

  test("refreshing a list entry queries the client with network-only and shows a success toast", async () => {
    seedListEntry();
    mockClientQuery.mockResolvedValueOnce({ data: { MediaListCollection: { lists: [] } } });

    render(
      <ChakraProvider>
        <CacheTab />
      </ChakraProvider>
    );
    await waitFor(() => expect(screen.getByTestId("cache-entry-refresh-list:42:CURRENT")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("cache-entry-refresh-list:42:CURRENT"));

    await waitFor(() => expect(mockClientQuery).toHaveBeenCalled());
    expect(mockClientQuery).toHaveBeenCalledWith(expect.objectContaining({ fetchPolicy: "network-only" }));
    await waitFor(() =>
      expect(mockSetAniListCache).toHaveBeenCalledWith("list:42:CURRENT", { MediaListCollection: { lists: [] } }, PROFILE_LIST_CACHE_TTL_MS)
    );
    await waitFor(() => expect(screen.getByText("List refreshed")).toBeInTheDocument());
  });

  test("clear-expired button is disabled when nothing has expired", async () => {
    mockApi.getCategorizedCacheEntries.mockResolvedValue([
      { ...emptySummaries[0], entries: [{ key: "profile", value: {}, expires_at: Date.now() + 60_000, sizeBytes: 2 }] },
      ...emptySummaries.slice(1),
    ]);

    render(<CacheTab />);

    await waitFor(() => expect(screen.getByTestId("clear-expired-cache-button")).toBeDisabled());
  });

  test("clear-expired button calls clearExpiredCache and shows a toast with the removed count", async () => {
    mockApi.getCategorizedCacheEntries.mockResolvedValue([
      { ...emptySummaries[0], entries: [{ key: "profile", value: {}, expires_at: Date.now() - 1000, sizeBytes: 2 }] },
      ...emptySummaries.slice(1),
    ]);
    mockApi.clearExpiredCache.mockResolvedValue(3);

    render(
      <ChakraProvider>
        <CacheTab />
      </ChakraProvider>
    );
    await waitFor(() => expect(screen.getByTestId("clear-expired-cache-button")).not.toBeDisabled());

    fireEvent.click(screen.getByTestId("clear-expired-cache-button"));

    await waitFor(() => expect(mockApi.clearExpiredCache).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Removed 3 expired entries")).toBeInTheDocument());
    expect(mockApi.getCategorizedCacheEntries).toHaveBeenCalledTimes(2);
  });

  test("clearing a category confirms the modal and calls clearCacheCategory with that category", async () => {
    seedListEntry();
    mockApi.clearCacheCategory.mockResolvedValue(undefined);

    render(
      <ChakraProvider>
        <CacheTab />
      </ChakraProvider>
    );
    await waitFor(() => expect(screen.getByTestId("clear-category-lists")).not.toBeDisabled());

    fireEvent.click(screen.getByTestId("clear-category-lists"));
    fireEvent.click(screen.getByTestId("confirm-clear-category-lists"));

    await waitFor(() => expect(mockApi.clearCacheCategory).toHaveBeenCalledWith("lists"));
    await waitFor(() => expect(screen.getByText("Category cleared")).toBeInTheDocument());
  });
});
