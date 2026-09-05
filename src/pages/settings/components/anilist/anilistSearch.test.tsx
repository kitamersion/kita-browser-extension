import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import AnilistSearch from "./anilistSearch";
import { SEARCH_ANIME_MEDIA } from "@/graphql/queries/searchAnimeMedia";
import { GET_GENRE_COLLECTION } from "@/graphql/queries/getGenreCollection";
import { GET_MEDIA_TAG_COLLECTION } from "@/graphql/queries/getMediaTagCollection";
import { MediaFormat, MediaListStatus, MediaSort } from "@/graphql";
import { SET_MEDIA_LIST_ENTRY_BY_ANILIST_ID } from "@/graphql/mutation/setMediaListEntryByAnilistId";

jest.mock("@/db/index", () => ({
  __esModule: true,
  default: {
    getAniListCache: jest.fn().mockResolvedValue(undefined),
    setAniListCache: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/context/toastNotificationContext", () => ({
  useToastContext: () => ({ showToast: jest.fn() }),
}));

const genreMock: MockedResponse = {
  request: { query: GET_GENRE_COLLECTION },
  result: { data: { GenreCollection: ["Action", "Comedy"] } },
};

const tagMock: MockedResponse = {
  request: { query: GET_MEDIA_TAG_COLLECTION },
  result: { data: { MediaTagCollection: [{ id: 1, name: "Isekai", category: "Setting", isAdult: false }] } },
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
  seasonYear: undefined,
  sort: [MediaSort.PopularityDesc],
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
});
