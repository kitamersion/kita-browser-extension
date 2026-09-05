import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import SavedVideosTab from "./savedVideosTab";

jest.mock("../components/savedVideosList", () => () => <div>SavedVideosList</div>);

describe("SavedVideosTab", () => {
  test("renders the heading and the saved videos list", () => {
    render(<SavedVideosTab />);

    expect(screen.getByRole("heading", { name: "Saved Videos" })).toBeInTheDocument();
    expect(screen.getByText("SavedVideosList")).toBeInTheDocument();
  });
});
