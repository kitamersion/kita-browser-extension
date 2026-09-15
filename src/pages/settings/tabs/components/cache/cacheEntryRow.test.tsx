import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CacheEntryRow from "./cacheEntryRow";
import { AniListCacheEntry } from "@/api/anilistCache";

const baseEntry: AniListCacheEntry = {
  key: "profile",
  value: { name: "Ada" },
  created_at: Date.now() - 60_000,
  expires_at: Date.now() + 540_000,
  sizeBytes: 42,
};

describe("CacheEntryRow", () => {
  test("renders the category preview title and subtitle", () => {
    render(<CacheEntryRow category="profile" entry={baseEntry} onDelete={jest.fn()} />);
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("AniList profile")).toBeInTheDocument();
  });

  test("shows an expired badge once expires_at has passed", () => {
    const expired = { ...baseEntry, created_at: Date.now() - 700_000, expires_at: Date.now() - 1000 };
    render(<CacheEntryRow category="profile" entry={expired} onDelete={jest.fn()} />);
    expect(screen.getByText("expired")).toBeInTheDocument();
  });

  test("delete button calls onDelete with the entry's key", async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined);
    render(<CacheEntryRow category="profile" entry={baseEntry} onDelete={onDelete} />);

    fireEvent.click(screen.getByTestId(`cache-entry-delete-${baseEntry.key}`));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("profile"));
  });

  test("refresh button is only rendered when onRefresh is provided, and calls it with the key", async () => {
    const { rerender } = render(<CacheEntryRow category="profile" entry={baseEntry} onDelete={jest.fn()} />);
    expect(screen.queryByTestId(`cache-entry-refresh-${baseEntry.key}`)).not.toBeInTheDocument();

    const onRefresh = jest.fn().mockResolvedValue(undefined);
    rerender(<CacheEntryRow category="profile" entry={baseEntry} onDelete={jest.fn()} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTestId(`cache-entry-refresh-${baseEntry.key}`));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledWith("profile"));
  });

  test("toggling 'View raw JSON' shows and hides the JSON viewer", () => {
    render(<CacheEntryRow category="profile" entry={baseEntry} onDelete={jest.fn()} />);

    fireEvent.click(screen.getByTestId(`cache-entry-toggle-json-${baseEntry.key}`));
    expect(screen.getByTestId("json-viewer-toggle")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`cache-entry-toggle-json-${baseEntry.key}`));
    expect(screen.queryByTestId("json-viewer-toggle")).not.toBeInTheDocument();
  });
});
