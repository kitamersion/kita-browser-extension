import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import AnilistSearch, { SEARCH_RESULTS_TTL_MS } from "./anilistSearch";
import { SEARCH_ANIME_MEDIA } from "@/graphql/queries/searchAnimeMedia";
import { GET_GENRE_COLLECTION } from "@/graphql/queries/getGenreCollection";
import { GET_MEDIA_TAG_COLLECTION } from "@/graphql/queries/getMediaTagCollection";
import { MediaFormat, MediaListStatus, MediaSort } from "@/graphql";
import { SET_MEDIA_LIST_ENTRY_BY_ANILIST_ID } from "@/graphql/mutation/setMediaListEntryByAnilistId";
import IndexedDB from "@/db/index";
import { SHA256 } from "crypto-js";

jest.mock("@/db/index", () => ({
  __esModule: true,
  default: {
    getAniListCache: jest.fn(),
    setAniListCache: jest.fn(),
  },
}));

jest.mock("@/context/toastNotificationContext", () => ({
  useToastContext: () => ({ showToast: jest.fn() }),
}));

const mockGetAniListCache = IndexedDB.getAniListCache as jest.Mock;
const mockSetAniListCache = IndexedDB.setAniListCache as jest.Mock;

beforeEach(() => {
  mockGetAniListCache.mockReset().mockResolvedValue(undefined);
  mockSetAniListCache.mockReset().mockResolvedValue(undefined);
});

const genreMock: MockedResponse = {
  request: { query: GET_GENRE_COLLECTION },
  result: { data: { GenreCollection: ["Action", "Comedy", "Hentai"] } },
};

const tagMock: MockedResponse = {
  request: { query: GET_MEDIA_TAG_COLLECTION },
  result: {
    data: {
      MediaTagCollection: [
        { id: 1, name: "Isekai", category: "Setting", isAdult: false },
        { id: 2, name: "Ecchi", category: "Theme", isAdult: true },
      ],
    },
  },
};

const makeMedia = (id: number, title: string) => ({
  id,
  title: { userPreferred: title },
  coverImage: { extraLarge: `https://example.com/${id}.jpg`, large: null },
  seasonYear: 2023,
  format: MediaFormat.Tv,
  episodes: 12,
  averageScore: 80,
  genres: ["Action"],
  siteUrl: `https://anilist.co/anime/${id}`,
  mediaListEntry: null,
});

const defaultVariables = {
  page: 1,
  search: undefined,
  genres: undefined,
  tags: undefined,
  formats: undefined,
  seasonYear: undefined,
  sort: [MediaSort.PopularityDesc],
  isAdult: false,
};

const resultsMock = (
  variables: Record<string, unknown>,
  media: ReturnType<typeof makeMedia>[],
  pageInfoOverrides: Record<string, unknown> = {}
): MockedResponse => ({
  request: { query: SEARCH_ANIME_MEDIA, variables },
  result: {
    data: {
      Page: {
        pageInfo: { total: media.length, perPage: 20, currentPage: variables.page, lastPage: 1, hasNextPage: false, ...pageInfoOverrides },
        media,
      },
    },
  },
});

describe("AnilistSearch", () => {
  test("renders results from the search query", async () => {
    const mocks = [genreMock, tagMock, resultsMock(defaultVariables, [makeMedia(1, "Frieren")])];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
  });

  test("shows an empty state when no media is returned", async () => {
    const mocks = [genreMock, tagMock, resultsMock(defaultVariables, [])];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("No results found.")).toBeInTheDocument();
  });

  test("shows an error state with a working retry button", async () => {
    const errorMock: MockedResponse = {
      request: { query: SEARCH_ANIME_MEDIA, variables: defaultVariables },
      error: new Error("network down"),
    };
    const retryMock = resultsMock(defaultVariables, [makeMedia(1, "Frieren")]);

    render(
      <MockedProvider mocks={[genreMock, tagMock, errorMock, retryMock]}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("network down")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("anilist-search-retry"));

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
  });

  test("debounces the search input before firing a new query", async () => {
    jest.useFakeTimers();
    const searchVariables = { ...defaultVariables, search: "Frieren", sort: [MediaSort.SearchMatch] };
    const mocks = [genreMock, tagMock, resultsMock(defaultVariables, []), resultsMock(searchVariables, [makeMedia(1, "Frieren")])];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    fireEvent.change(screen.getByTestId("anilist-search-input"), { target: { value: "Frieren" } });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByText("Frieren")).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    jest.useRealTimers();
    await waitFor(() => expect(screen.getByText("Frieren")).toBeInTheDocument());
  });

  test("changing a filter resets to page 1 and refires the query with new variables", async () => {
    const page2Variables = { ...defaultVariables, page: 2 };
    const genreVariables = { ...defaultVariables, genres: ["Action"] };
    const mocks = [
      genreMock,
      tagMock,
      resultsMock(defaultVariables, [makeMedia(1, "Frieren")], { hasNextPage: true, lastPage: 2 }),
      resultsMock(page2Variables, [makeMedia(2, "Page Two Show")]),
      resultsMock(genreVariables, [makeMedia(3, "Filtered Show")]),
    ];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("anilist-search-next-page"));
    expect(await screen.findByText("Page Two Show")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("multiselect-Genres-trigger"));
    await userEvent.click(await screen.findByTestId("multiselect-Genres-option-Action"));

    expect(await screen.findByText("Filtered Show")).toBeInTheDocument();
  });

  test("disables Prev on the first page and Next when there is no next page", async () => {
    const mocks = [genreMock, tagMock, resultsMock(defaultVariables, [makeMedia(1, "Frieren")], { hasNextPage: false })];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
    expect(screen.getByTestId("anilist-search-prev-page")).toBeDisabled();
    expect(screen.getByTestId("anilist-search-next-page")).toBeDisabled();
  });

  test("does not flash the empty state before the query resolves", () => {
    const mocks = [genreMock, tagMock, resultsMock(defaultVariables, [makeMedia(1, "Frieren")])];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(screen.queryByText("No results found.")).not.toBeInTheDocument();
  });

  test("adding a status from a card in the results grid calls the mutation", async () => {
    const media1 = makeMedia(1, "Frieren");
    const mocks = [
      genreMock,
      tagMock,
      resultsMock(defaultVariables, [media1]),
      {
        request: { query: SET_MEDIA_LIST_ENTRY_BY_ANILIST_ID, variables: { mediaId: 1, status: MediaListStatus.Planning } },
        result: { data: { SaveMediaListEntry: { id: 1, progress: 0, userId: 1, status: MediaListStatus.Planning } } },
      },
    ];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("anilist-search-status-menu-button"));
    await userEvent.click(await screen.findByTestId(`anilist-search-status-menu-option-${MediaListStatus.Planning}`));

    await waitFor(() => expect(screen.getByTestId("anilist-search-status-menu-button")).toHaveTextContent("Planning"));
  });

  test("Genres and Tags exclude adult options until Show adult is checked", async () => {
    const mocks = [genreMock, tagMock, resultsMock(defaultVariables, [makeMedia(1, "Frieren")])];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("multiselect-Genres-trigger"));
    expect(screen.queryByTestId("multiselect-Genres-option-Hentai")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("multiselect-Genres-trigger"));

    await userEvent.click(screen.getByTestId("multiselect-Tags-trigger"));
    expect(screen.queryByTestId("multiselect-Tags-option-Ecchi")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("multiselect-Tags-trigger"));

    await userEvent.click(screen.getByTestId("anilist-search-adult-toggle"));

    await userEvent.click(screen.getByTestId("multiselect-Genres-trigger"));
    expect(await screen.findByTestId("multiselect-Genres-option-Hentai")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("multiselect-Genres-trigger"));

    await userEvent.click(screen.getByTestId("multiselect-Tags-trigger"));
    expect(await screen.findByTestId("multiselect-Tags-option-Ecchi")).toBeInTheDocument();
  });

  test("selecting a Format option refires the query with the format filter applied", async () => {
    const formatVariables = { ...defaultVariables, formats: [MediaFormat.Movie] };
    const mocks = [
      genreMock,
      tagMock,
      resultsMock(defaultVariables, [makeMedia(1, "Frieren")]),
      resultsMock(formatVariables, [makeMedia(2, "A Silent Voice")]),
    ];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("multiselect-Format-trigger"));
    await userEvent.click(await screen.findByTestId(`multiselect-Format-option-${MediaFormat.Movie}`));

    expect(await screen.findByText("A Silent Voice")).toBeInTheDocument();
  });

  test("checking Show adult resets to page 1 and refires the query with isAdult true", async () => {
    const adultVariables = { ...defaultVariables, isAdult: true };
    const mocks = [
      genreMock,
      tagMock,
      resultsMock(defaultVariables, [makeMedia(1, "Frieren")]),
      resultsMock(adultVariables, [makeMedia(2, "Redo of Healer")]),
    ];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("anilist-search-adult-toggle"));

    expect(await screen.findByText("Redo of Healer")).toBeInTheDocument();
  });

  test("renders a cached results page without calling the AniList API again", async () => {
    const cachedPage = {
      pageInfo: { total: 1, perPage: 20, currentPage: 1, lastPage: 1, hasNextPage: false },
      media: [makeMedia(1, "Frieren")],
    };
    mockGetAniListCache.mockImplementation((key: string) =>
      Promise.resolve(key.startsWith("search:") ? cachedPage : undefined)
    );

    // No resultsMock provided: if the implementation skipped the cache and
    // hit the network anyway, Apollo would have no mock to satisfy the
    // request and this would fail to find the cached title.
    render(
      <MockedProvider mocks={[genreMock, tagMock]}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
  });

  test("caches a freshly fetched results page with a 5 minute TTL", async () => {
    const media1 = makeMedia(1, "Frieren");
    const mocks = [genreMock, tagMock, resultsMock(defaultVariables, [media1])];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();

    await waitFor(() =>
      expect(mockSetAniListCache).toHaveBeenCalledWith(
        `search:${SHA256(JSON.stringify(defaultVariables)).toString()}`,
        { pageInfo: { total: 1, perPage: 20, currentPage: 1, lastPage: 1, hasNextPage: false }, media: [media1] },
        SEARCH_RESULTS_TTL_MS
      )
    );
  });

  test("typing a page number and pressing Enter jumps directly to that page", async () => {
    const page4Variables = { ...defaultVariables, page: 4 };
    const mocks = [
      genreMock,
      tagMock,
      resultsMock(defaultVariables, [makeMedia(1, "Frieren")], { hasNextPage: true, lastPage: 5 }),
      resultsMock(page4Variables, [makeMedia(2, "Page Four Show")], { hasNextPage: true, lastPage: 5 }),
    ];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();

    const pageInput = screen.getByTestId("anilist-search-page-input");
    await userEvent.clear(pageInput);
    await userEvent.type(pageInput, "4{Enter}");

    expect(await screen.findByText("Page Four Show")).toBeInTheDocument();
  });

  test("clamps a manually entered page above the last page down to the last page", async () => {
    const page2Variables = { ...defaultVariables, page: 2 };
    const mocks = [
      genreMock,
      tagMock,
      resultsMock(defaultVariables, [makeMedia(1, "Frieren")], { hasNextPage: true, lastPage: 2 }),
      resultsMock(page2Variables, [makeMedia(2, "Page Two Show")]),
    ];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();

    const pageInput = screen.getByTestId("anilist-search-page-input");
    await userEvent.clear(pageInput);
    await userEvent.type(pageInput, "99{Enter}");

    expect(await screen.findByText("Page Two Show")).toBeInTheDocument();
  });

  test("clamps a manually entered page below 1 up to 1 without refetching", async () => {
    const mocks = [genreMock, tagMock, resultsMock(defaultVariables, [makeMedia(1, "Frieren")], { hasNextPage: true, lastPage: 2 })];

    render(
      <MockedProvider mocks={mocks}>
        <AnilistSearch />
      </MockedProvider>
    );

    expect(await screen.findByText("Frieren")).toBeInTheDocument();

    const pageInput = screen.getByTestId("anilist-search-page-input");
    await userEvent.clear(pageInput);
    await userEvent.type(pageInput, "0{Enter}");

    // No mock exists for page 0/negative pages: staying on Frieren (rather
    // than erroring) proves the clamp kept the request on page 1.
    await waitFor(() => expect(pageInput).toHaveValue("1"));
    expect(screen.getByText("Frieren")).toBeInTheDocument();
  });
});
