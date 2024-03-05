import React from "react";
import { render } from "@testing-library/react";
import ErrorState from ".";

describe("ErrorState Component", () => {
  it("renders with default message", () => {
    // arrange
    const { getByText } = render(<ErrorState />);

    // act
    const defaultMessage = getByText("Something went wrong");

    // assert
    expect(defaultMessage).toBeTruthy();
  });

  it("renders with custom message", () => {
    // arrange
    const customMessage = "Custom error message";
    const { getByText } = render(<ErrorState message={customMessage} />);

    // act
    const errorMessage = getByText(customMessage);

    // assert
    expect(errorMessage).toBeTruthy();
  });
});
