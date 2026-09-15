import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CacheTab from "./cacheTab";
import * as anilistCacheApi from "@/api/anilistCache";
import { AniListCacheCategorySummary } from "@/api/anilistCache";

jest.mock("@/api/anilistCache");
jest.mock("@/db", () => ({ __esModule: true, default: { setAniListCache: jest.fn() } }));
jest.mock("@apollo/client", () => ({
  ...jest.requireActual("@apollo/client"),
  useApolloClient: () => ({ query: jest.fn() }),
}));
jest.mock("@/graphql", () => ({
  ...jest.requireActual("@/graphql"),
  useGetMeQuery: () => ({ refetch: jest.fn().mockResolvedValue({ data: { Viewer: { name: "Refreshed" } } }) }),
  useGetUserAnimeListLazyQuery: () => [jest.fn()],
}));
jest.mock("./components/cache/seriesMappingSummaryCard", () => {
  const MockSeriesMappingSummaryCard = () => <div data-testid="series-mapping-summary-stub" />;
  return MockSeriesMappingSummaryCard;
});

const mockApi = anilistCacheApi as jest.Mocked<typeof anilistCacheApi>;

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
});
