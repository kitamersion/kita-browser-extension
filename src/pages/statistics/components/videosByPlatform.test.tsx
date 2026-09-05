import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import VideosByPlatform from "./videosByPlatform";
import { useVideoContext } from "@/context/videoContext";
import { SiteKey } from "@/types/video";

jest.mock("@/context/videoContext", () => ({
  useVideoContext: jest.fn(),
}));

const mockUseVideoContext = useVideoContext as jest.Mock;

const makeVideo = (id: string, origin: SiteKey) => ({
  id,
  video_title: "Video",
  video_duration: 100,
  video_url: "https://example.com",
  origin,
  created_at: Date.now(),
});

describe("VideosByPlatform", () => {
  test("renders nothing when only one platform has been used", () => {
    mockUseVideoContext.mockReturnValue({ totalVideos: [makeVideo("1", SiteKey.YOUTUBE), makeVideo("2", SiteKey.YOUTUBE)] });

    const { container } = render(<VideosByPlatform />);

    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing when there are no videos", () => {
    mockUseVideoContext.mockReturnValue({ totalVideos: [] });

    const { container } = render(<VideosByPlatform />);

    expect(container).toBeEmptyDOMElement();
  });

  test("renders a ranked row per platform present, busiest first", () => {
    mockUseVideoContext.mockReturnValue({
      totalVideos: [
        makeVideo("1", SiteKey.CRUNCHYROLL),
        makeVideo("2", SiteKey.YOUTUBE),
        makeVideo("3", SiteKey.YOUTUBE),
        makeVideo("4", SiteKey.YOUTUBE),
      ],
    });

    render(<VideosByPlatform />);

    const rows = screen.getAllByText(/YouTube|Crunchyroll/);
    expect(rows[0]).toHaveTextContent("YouTube");
    expect(screen.getByTestId(`platform-row-${SiteKey.YOUTUBE}`)).toHaveTextContent("3");
    expect(screen.getByTestId(`platform-row-${SiteKey.CRUNCHYROLL}`)).toHaveTextContent("1");
  });
});
