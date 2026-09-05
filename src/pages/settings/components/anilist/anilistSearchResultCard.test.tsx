import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import AnilistSearchResultCard from "./anilistSearchResultCard";
import { AnilistSearchMediaResult } from "./anilistSearchTypes";
import { MediaFormat } from "@/graphql";

jest.mock("@/context/toastNotificationContext", () => ({
  useToastContext: () => ({ showToast: jest.fn() }),
}));

const media: AnilistSearchMediaResult = {
  id: 42,
  title: { userPreferred: "Frieren: Beyond Journey's End" },
  coverImage: { extraLarge: "https://example.com/cover.jpg", large: null },
  seasonYear: 2023,
  format: MediaFormat.Tv,
  episodes: 28,
  averageScore: 90,
  genres: ["Adventure", "Drama"],
  siteUrl: "https://anilist.co/anime/154587",
  mediaListEntry: null,
};

describe("AnilistSearchResultCard", () => {
  test("renders the title, cover image, and metadata badges", () => {
    render(
      <MockedProvider mocks={[]}>
        <AnilistSearchResultCard media={media} />
      </MockedProvider>
    );

    expect(screen.getByText("Frieren: Beyond Journey's End")).toBeInTheDocument();
    expect(screen.getAllByRole("img")[0]).toHaveAttribute("src", "https://example.com/cover.jpg");
    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  test("links to the AniList site page in a new tab", () => {
    render(
      <MockedProvider mocks={[]}>
        <AnilistSearchResultCard media={media} />
      </MockedProvider>
    );

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link).toHaveAttribute("href", "https://anilist.co/anime/154587");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  test("renders the status menu with 'Add to List' when there is no existing entry", () => {
    render(
      <MockedProvider mocks={[]}>
        <AnilistSearchResultCard media={media} />
      </MockedProvider>
    );

    expect(screen.getByTestId("anilist-search-status-menu-button")).toHaveTextContent("Add to List");
  });
});
