import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import KitaSyncPausedAlert from "./kitaSyncPausedAlert";

describe("KitaSyncPausedAlert", () => {
  test("calls onResume when the resume button is clicked", () => {
    const onResume = jest.fn();
    render(<KitaSyncPausedAlert onResume={onResume} />);

    expect(screen.getByText("Kita Sync is paused.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Resume Kita Sync"));

    expect(onResume).toHaveBeenCalled();
  });
});
