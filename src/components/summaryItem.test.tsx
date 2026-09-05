import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MdVideoLibrary } from "react-icons/md";
import SummaryItem from "./summaryItem";

describe("SummaryItem", () => {
  test("renders the title and value regardless of the order children are passed in", () => {
    render(
      <SummaryItem icon={MdVideoLibrary}>
        <SummaryItem.Value value={128} />
        <SummaryItem.Title>Total Videos</SummaryItem.Title>
      </SummaryItem>
    );

    expect(screen.getByText("Total Videos")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  test("renders without an icon badge when no icon is provided", () => {
    const { container } = render(
      <SummaryItem>
        <SummaryItem.Value value={24} />
        <SummaryItem.Title>Total Tags</SummaryItem.Title>
      </SummaryItem>
    );

    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  test("compact variant still renders title and value inline", () => {
    render(<SummaryItem.Compact value="1h 36m" title="Today" />);

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("1h 36m")).toBeInTheDocument();
  });

  test("compact variant renders an icon badge when an icon is provided", () => {
    const { container } = render(<SummaryItem.Compact value="1h 36m" title="Today" icon={MdVideoLibrary} />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  test("compact variant renders without an icon badge when no icon is provided", () => {
    const { container } = render(<SummaryItem.Compact value="1h 36m" title="Today" />);

    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});
