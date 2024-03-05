import "@testing-library/jest-dom";
import React from "react";
import { render } from "@testing-library/react";
import LoadingState from ".";

describe("LoadingState Component", () => {
  it("renders the loading state with the correct Spinner props", () => {
    // arrange
    const { getByTestId } = render(<LoadingState />);

    // act
    const spinner = getByTestId("loading-spinner");

    // assert
    expect(spinner).toBeInTheDocument();
  });

  it("renders the loading state centered", () => {
    // arrange
    const { getByTestId } = render(<LoadingState />);

    // act
    const center = getByTestId("loading-center");

    // assert
    expect(center).toBeInTheDocument();
  });
});
