import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsSidebar from "./settingsSidebar";
import { SettingsNavGroup } from "@/data/settingsNav";

const groups: SettingsNavGroup[] = [
  {
    id: "track",
    label: "Track",
    description: "Connect platforms and manage auto-tracking",
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
    description: "Developer & diagnostic tools",
    collapsedByDefault: true,
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

  test("the advanced group starts collapsed and expands on click", () => {
    render(
      <SettingsSidebar groups={groups} selectedId="integration" onSelect={jest.fn()} navContext={{ anilistAuthStatus: "unauthorized" }} />
    );

    expect(screen.queryByTestId("settings-nav-item-logs")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("settings-nav-group-advanced-toggle"));

    expect(screen.getByTestId("settings-nav-item-logs")).toBeInTheDocument();
  });

  test("renders each group's label and description", () => {
    render(
      <SettingsSidebar groups={groups} selectedId="integration" onSelect={jest.fn()} navContext={{ anilistAuthStatus: "unauthorized" }} />
    );

    expect(screen.getByText("Track")).toBeInTheDocument();
    expect(screen.getByText("Connect platforms and manage auto-tracking")).toBeInTheDocument();
  });
});
