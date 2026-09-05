import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import SavedVideosTab from "./savedVideosTab";

jest.mock("../components/savedVideosList", () => {
  const MockSavedVideosList = () => <div>SavedVideosList</div>;
  return MockSavedVideosList;
});

describe("SavedVideosTab", () => {
  test("renders the saved videos list", () => {
    render(<SavedVideosTab />);

    expect(screen.getByText("SavedVideosList")).toBeInTheDocument();
  });
});
