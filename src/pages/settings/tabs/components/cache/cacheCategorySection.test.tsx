import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CacheCategorySection from "./cacheCategorySection";
import { AniListCacheCategorySummary } from "@/api/anilistCache";

const summaryWithOneEntry: AniListCacheCategorySummary = {
  category: "profile",
  label: "Profile",
  entries: [{ key: "profile", value: { name: "Ada" }, created_at: Date.now(), expires_at: Date.now() + 60_000, sizeBytes: 10 }],
  totalSizeBytes: 10,
};

const emptySummary: AniListCacheCategorySummary = {
  category: "lists",
  label: "Anime Lists",
  entries: [],
  totalSizeBytes: 0,
};

describe("CacheCategorySection", () => {
  test("shows an empty state when there are no entries", () => {
    render(<CacheCategorySection summary={emptySummary} isLoading={false} onDelete={jest.fn()} onClearCategory={jest.fn()} />);
    expect(screen.getByTestId("cache-category-empty-lists")).toBeInTheDocument();
  });

  test("renders one CacheEntryRow per entry and the category's entry count", () => {
    render(<CacheCategorySection summary={summaryWithOneEntry} isLoading={false} onDelete={jest.fn()} onClearCategory={jest.fn()} />);
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("clear category button is disabled when the category is empty", () => {
    render(<CacheCategorySection summary={emptySummary} isLoading={false} onDelete={jest.fn()} onClearCategory={jest.fn()} />);
    expect(screen.getByTestId("clear-category-lists")).toBeDisabled();
  });

  test("confirming the clear-category modal calls onClearCategory with the category", async () => {
    const onClearCategory = jest.fn().mockResolvedValue(undefined);
    render(<CacheCategorySection summary={summaryWithOneEntry} isLoading={false} onDelete={jest.fn()} onClearCategory={onClearCategory} />);

    fireEvent.click(screen.getByTestId("clear-category-profile"));
    fireEvent.click(screen.getByTestId("confirm-clear-category-profile"));

    await waitFor(() => expect(onClearCategory).toHaveBeenCalledWith("profile"));
  });
});
