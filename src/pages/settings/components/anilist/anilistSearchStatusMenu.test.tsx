import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import AnilistSearchStatusMenu from "./anilistSearchStatusMenu";
import { MediaListStatus } from "@/graphql";
import { SET_MEDIA_LIST_ENTRY_BY_ANILIST_ID } from "@/graphql/mutation/setMediaListEntryByAnilistId";

const mockShowToast = jest.fn();
jest.mock("@/context/toastNotificationContext", () => ({
  useToastContext: () => ({ showToast: mockShowToast }),
}));

const successMock: MockedResponse = {
  request: {
    query: SET_MEDIA_LIST_ENTRY_BY_ANILIST_ID,
    variables: { mediaId: 1, status: MediaListStatus.Planning },
  },
  result: {
    data: {
      SaveMediaListEntry: { id: 1, progress: 0, userId: 1, status: MediaListStatus.Planning },
    },
  },
};

const errorMock: MockedResponse = {
  request: {
    query: SET_MEDIA_LIST_ENTRY_BY_ANILIST_ID,
    variables: { mediaId: 1, status: MediaListStatus.Planning },
  },
  error: new Error("network down"),
};

describe("AnilistSearchStatusMenu", () => {
  beforeEach(() => {
    mockShowToast.mockReset();
  });

  test("shows 'Add to List' when there is no existing status", () => {
    render(
      <MockedProvider mocks={[]}>
        <AnilistSearchStatusMenu mediaId={1} initialStatus={null} />
      </MockedProvider>
    );

    expect(screen.getByTestId("anilist-search-status-menu-button")).toHaveTextContent("Add to List");
  });

  test("shows the current status label when one is already set", () => {
    render(
      <MockedProvider mocks={[]}>
        <AnilistSearchStatusMenu mediaId={1} initialStatus={MediaListStatus.Current} />
      </MockedProvider>
    );

    expect(screen.getByTestId("anilist-search-status-menu-button")).toHaveTextContent("Watching");
  });

  test("selecting a status calls the mutation and updates the label on success", async () => {
    const user = userEvent.setup();
    render(
      <MockedProvider mocks={[successMock]}>
        <AnilistSearchStatusMenu mediaId={1} initialStatus={null} />
      </MockedProvider>
    );

    await user.click(screen.getByTestId("anilist-search-status-menu-button"));
    await user.click(await screen.findByTestId(`anilist-search-status-menu-option-${MediaListStatus.Planning}`));

    await waitFor(() => expect(screen.getByTestId("anilist-search-status-menu-button")).toHaveTextContent("Planning"));
    expect(mockShowToast).toHaveBeenCalledWith({ title: "Added to Planning", status: "success" });
  });

  test("selecting a status shows an error toast and leaves the label unchanged on failure", async () => {
    const user = userEvent.setup();
    render(
      <MockedProvider mocks={[errorMock]}>
        <AnilistSearchStatusMenu mediaId={1} initialStatus={null} />
      </MockedProvider>
    );

    await user.click(screen.getByTestId("anilist-search-status-menu-button"));
    await user.click(await screen.findByTestId(`anilist-search-status-menu-option-${MediaListStatus.Planning}`));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith({ title: "network down", status: "error" }));
    expect(screen.getByTestId("anilist-search-status-menu-button")).toHaveTextContent("Add to List");
  });
});
