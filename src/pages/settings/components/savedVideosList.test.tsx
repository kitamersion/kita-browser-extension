import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SavedVideosList from "./savedVideosList";
import { useVideoPagination } from "@/hooks/useVideoPagination";
import { SiteKey } from "@/types/video";

jest.mock("@/hooks/useVideoPagination");
jest.mock("@/pages/popup/components/updateVideo", () => {
  const MockUpdateVideo = () => <div>UpdateVideo</div>;
  return MockUpdateVideo;
});
jest.mock("@/pages/popup/components/deleteVideo", () => {
  const MockDeleteVideo = () => <div>DeleteVideo</div>;
  return MockDeleteVideo;
});

const mockUseVideoPagination = useVideoPagination as jest.Mock;

const makeVideo = (id: string, title: string) => ({
  id,
  video_title: title,
  video_duration: 125,
  video_url: `https://example.com/${id}`,
  origin: SiteKey.YOUTUBE,
  created_at: 1700000000000,
});

describe("SavedVideosList", () => {
  test("renders saved videos with their title, duration, origin, and actions", () => {
    mockUseVideoPagination.mockReturnValue({
      page: 0,
      paginatedResult: { page: 0, pageSize: 20, results: [makeVideo("1", "Frieren Episode 1")], totalPages: 1 },
      handleNext: jest.fn(),
      handlePrevious: jest.fn(),
    });

    render(<SavedVideosList />);

    expect(screen.getByText("Frieren Episode 1")).toBeInTheDocument();
    expect(screen.getByText("YOUTUBE")).toBeInTheDocument();
    expect(screen.getByText("UpdateVideo")).toBeInTheDocument();
    expect(screen.getByText("DeleteVideo")).toBeInTheDocument();
  });

  test("shows the linked title as an external link when a video URL is present", () => {
    mockUseVideoPagination.mockReturnValue({
      page: 0,
      paginatedResult: { page: 0, pageSize: 20, results: [makeVideo("1", "Frieren Episode 1")], totalPages: 1 },
      handleNext: jest.fn(),
      handlePrevious: jest.fn(),
    });

    render(<SavedVideosList />);

    expect(screen.getByRole("link", { name: "Frieren Episode 1" })).toHaveAttribute("href", "https://example.com/1");
  });

  test("disables Previous on the first page and Next on the last page", async () => {
    const handleNext = jest.fn();
    const handlePrevious = jest.fn();
    mockUseVideoPagination.mockReturnValue({
      page: 0,
      paginatedResult: { page: 0, pageSize: 20, results: [makeVideo("1", "Frieren Episode 1")], totalPages: 1 },
      handleNext,
      handlePrevious,
    });

    render(<SavedVideosList />);

    expect(screen.getByText("Previous").closest("button")).toBeDisabled();
    expect(screen.getByText("Next").closest("button")).toBeDisabled();

    await userEvent.click(screen.getByText("Previous"));
    await userEvent.click(screen.getByText("Next"));
    expect(handlePrevious).not.toHaveBeenCalled();
    expect(handleNext).not.toHaveBeenCalled();
  });

  test("calls handleNext when Next is clicked on a non-final page", async () => {
    const handleNext = jest.fn();
    mockUseVideoPagination.mockReturnValue({
      page: 0,
      paginatedResult: {
        page: 0,
        pageSize: 20,
        results: [makeVideo("1", "Frieren Episode 1")],
        totalPages: 2,
      },
      handleNext,
      handlePrevious: jest.fn(),
    });

    render(<SavedVideosList />);

    await userEvent.click(screen.getByText("Next"));
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  test("shows an empty state instead of the table when there are no saved videos", () => {
    mockUseVideoPagination.mockReturnValue({
      page: 0,
      paginatedResult: { page: 0, pageSize: 20, results: [], totalPages: 0 },
      handleNext: jest.fn(),
      handlePrevious: jest.fn(),
    });

    render(<SavedVideosList />);

    expect(screen.getByText("No saved videos yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
