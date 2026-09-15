import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import JsonViewer from "./jsonViewer";

describe("JsonViewer", () => {
  test("renders a primitive leaf value directly", () => {
    render(<JsonViewer value="hello" name="title" />);
    expect(screen.getByText("title:")).toBeInTheDocument();
    expect(screen.getByText('"hello"')).toBeInTheDocument();
  });

  test("shows the entry count for an object and expands its children by default at the top level", () => {
    render(<JsonViewer value={{ a: 1, b: 2 }} />);
    expect(screen.getByText("Object(2)")).toBeInTheDocument();
    expect(screen.getByText("a:")).toBeInTheDocument();
    expect(screen.getByText("b:")).toBeInTheDocument();
  });

  test("collapses and re-expands an object's children on click", () => {
    render(<JsonViewer value={{ a: 1 }} />);
    expect(screen.getByText("a:")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("json-viewer-toggle"));
    expect(screen.queryByText("a:")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("json-viewer-toggle"));
    expect(screen.getByText("a:")).toBeInTheDocument();
  });

  test("renders arrays with numeric index labels", () => {
    render(<JsonViewer value={["x", "y"]} />);
    expect(screen.getByText("Array(2)")).toBeInTheDocument();
    expect(screen.getByText("0:")).toBeInTheDocument();
    expect(screen.getByText("1:")).toBeInTheDocument();
  });
});
