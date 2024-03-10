import React from "react";
import { render } from "@testing-library/react";
import EmptyState from ".";

describe("EmptyState Component", () => {
  it("renders correctly with default message", () => {
    // arrange
    const { getByText } = render(<EmptyState />);

    // act
    const defaultMessage = getByText("No videos found.");

    // assert
    expect(defaultMessage).toBeTruthy();
  });
});
