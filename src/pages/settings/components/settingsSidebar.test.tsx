import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsSidebar from "./settingsSidebar";
import { SettingsNavGroup } from "@/data/settingsNav";

const groups: SettingsNavGroup[] = [
  {
    id: "track",
    label: "Track",
    items: [
      { id: "integration", label: "Integrations", component: () => null },
      {
        id: "anilist",
        label: "AniList Profile",
        component: () => null,
        condition: (ctx) => ctx.anilistAuthStatus === "authorized",
      },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    items: [{ id: "logs", label: "Logs", component: () => null }],
  },
];

describe("SettingsSidebar", () => {
  test("selecting an item calls onSelect with its id", () => {
    const onSelect = jest.fn();
    render(
      <SettingsSidebar groups={groups} selectedId="integration" onSelect={onSelect} navContext={{ anilistAuthStatus: "unauthorized" }} />
    );

    fireEvent.click(screen.getByTestId("settings-nav-item-integration"));

    expect(onSelect).toHaveBeenCalledWith("integration");
  });

  test("hides the anilist item until authorized", () => {
    const { rerender } = render(
      <SettingsSidebar groups={groups} selectedId="integration" onSelect={jest.fn()} navContext={{ anilistAuthStatus: "unauthorized" }} />
    );
    expect(screen.queryByTestId("settings-nav-item-anilist")).not.toBeInTheDocument();

    rerender(
      <SettingsSidebar groups={groups} selectedId="integration" onSelect={jest.fn()} navContext={{ anilistAuthStatus: "authorized" }} />
    );
    expect(screen.getByTestId("settings-nav-item-anilist")).toBeInTheDocument();
  });

  test("all group items are visible without needing to expand", () => {
    render(
      <SettingsSidebar groups={groups} selectedId="integration" onSelect={jest.fn()} navContext={{ anilistAuthStatus: "unauthorized" }} />
    );

    expect(screen.getByTestId("settings-nav-item-logs")).toBeInTheDocument();
  });

  test("renders each group's label", () => {
    render(
      <SettingsSidebar groups={groups} selectedId="integration" onSelect={jest.fn()} navContext={{ anilistAuthStatus: "unauthorized" }} />
    );

    expect(screen.getByText("Track")).toBeInTheDocument();
  });
});
