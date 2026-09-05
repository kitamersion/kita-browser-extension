import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityStreak from "./activityStreak";
import { useVideoContext } from "@/context/videoContext";
import { SiteKey } from "@/types/video";

jest.mock("@/context/videoContext", () => ({
  useVideoContext: jest.fn(),
}));

const mockUseVideoContext = useVideoContext as jest.Mock;

const makeVideo = (id: string, created_at: number) => ({
  id,
  video_title: "Video",
  video_duration: 100,
  video_url: "https://example.com",
  origin: SiteKey.YOUTUBE,
  created_at,
});

describe("ActivityStreak", () => {
  test("renders 52 week columns of 7 days each (364 day cells total)", () => {
    mockUseVideoContext.mockReturnValue({ totalVideos: [] });

    render(<ActivityStreak />);

    expect(screen.getAllByTestId("activity-streak-day")).toHaveLength(52 * 7);
  });

  test("shows the total video count within the visible range", () => {
    const today = new Date();
    mockUseVideoContext.mockReturnValue({ totalVideos: [makeVideo("1", today.getTime()), makeVideo("2", today.getTime())] });

    render(<ActivityStreak />);

    expect(screen.getByText("2 videos")).toBeInTheDocument();
  });

  test("uses singular wording for exactly one video", () => {
    const today = new Date();
    mockUseVideoContext.mockReturnValue({ totalVideos: [makeVideo("1", today.getTime())] });

    render(<ActivityStreak />);

    expect(screen.getByText("1 video")).toBeInTheDocument();
  });

  test("shows the count and date on hover for a day with activity", async () => {
    const today = new Date();
    const todayKey = today.toISOString().split("T")[0];
    mockUseVideoContext.mockReturnValue({ totalVideos: [makeVideo("1", today.getTime())] });

    const { container } = render(<ActivityStreak />);

    const todayCell = container.querySelector(`[data-date="${todayKey}"]`);
    expect(todayCell).not.toBeNull();
    await userEvent.hover(todayCell as Element);

    expect(await screen.findByText(`1 video on ${todayKey}`)).toBeInTheDocument();
  });
});
