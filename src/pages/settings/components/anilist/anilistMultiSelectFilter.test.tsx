import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnilistMultiSelectFilter from "./anilistMultiSelectFilter";

const options = [
  { value: "action", label: "Action" },
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
];

describe("AnilistMultiSelectFilter", () => {
  test("shows the label with no count when nothing is selected", () => {
    render(<AnilistMultiSelectFilter label="Genres" options={options} selectedValues={[]} onChange={jest.fn()} />);
    expect(screen.getByTestId("multiselect-Genres-trigger")).toHaveTextContent("Genres");
  });

  test("shows the selected count in the trigger label", () => {
    render(<AnilistMultiSelectFilter label="Genres" options={options} selectedValues={["action"]} onChange={jest.fn()} />);
    expect(screen.getByTestId("multiselect-Genres-trigger")).toHaveTextContent("Genres (1)");
  });

  test("opening the popover lists all options", async () => {
    const user = userEvent.setup();
    render(<AnilistMultiSelectFilter label="Genres" options={options} selectedValues={[]} onChange={jest.fn()} />);

    await user.click(screen.getByTestId("multiselect-Genres-trigger"));

    expect(await screen.findByTestId("multiselect-Genres-option-action")).toBeInTheDocument();
    expect(screen.getByTestId("multiselect-Genres-option-comedy")).toBeInTheDocument();
    expect(screen.getByTestId("multiselect-Genres-option-drama")).toBeInTheDocument();
  });

  test("typing in the search box filters the option list", async () => {
    const user = userEvent.setup();
    render(<AnilistMultiSelectFilter label="Genres" options={options} selectedValues={[]} onChange={jest.fn()} />);

    await user.click(screen.getByTestId("multiselect-Genres-trigger"));
    await user.type(await screen.findByTestId("multiselect-Genres-search"), "com");

    expect(screen.getByTestId("multiselect-Genres-option-comedy")).toBeInTheDocument();
    expect(screen.queryByTestId("multiselect-Genres-option-action")).not.toBeInTheDocument();
  });

  test("checking an option calls onChange with the value added", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<AnilistMultiSelectFilter label="Genres" options={options} selectedValues={["action"]} onChange={onChange} />);

    await user.click(screen.getByTestId("multiselect-Genres-trigger"));
    await user.click(await screen.findByTestId("multiselect-Genres-option-comedy"));

    expect(onChange).toHaveBeenCalledWith(["action", "comedy"]);
  });

  test("unchecking a selected option calls onChange with the value removed", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<AnilistMultiSelectFilter label="Genres" options={options} selectedValues={["action", "comedy"]} onChange={onChange} />);

    await user.click(screen.getByTestId("multiselect-Genres-trigger"));
    await user.click(await screen.findByTestId("multiselect-Genres-option-action"));

    expect(onChange).toHaveBeenCalledWith(["comedy"]);
  });
});
