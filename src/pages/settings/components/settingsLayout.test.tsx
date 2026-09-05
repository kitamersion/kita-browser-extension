import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsLayout from "./settingsLayout";
import useScreenSize from "@/hooks/useScreenSize";

jest.mock("@/hooks/useScreenSize");
const mockUseScreenSize = useScreenSize as jest.Mock;

jest.mock("@/data/settingsNav", () => {
  const actual = jest.requireActual("@/data/settingsNav");
  return {
    ...actual,
    SETTINGS_GROUPS: [
      {
        id: "track",
        label: "Track",
        items: [{ id: "integration", label: "Integrations", component: () => <div>Track panel content</div> }],
      },
      {
        id: "advanced",
        label: "Advanced",
        items: [{ id: "logs", label: "Logs", component: () => <div>Advanced panel content</div> }],
      },
    ],
  };
});

const navContext = { anilistAuthStatus: "unauthorized" as const };

describe("SettingsLayout", () => {
  test("renders the sidebar inline and the initial panel on desktop", () => {
    mockUseScreenSize.mockReturnValue({ isMobile: false, isSmallerScreen: false, columns: 3 });

    render(<SettingsLayout initialSelectedId="integration" navContext={navContext} />);

    expect(screen.getByTestId("settings-sidebar-desktop")).toBeInTheDocument();
    expect(screen.getByText("Track panel content")).toBeInTheDocument();
  });

  test("falls back to the first visible item when the initial id isn't visible", () => {
    mockUseScreenSize.mockReturnValue({ isMobile: false, isSmallerScreen: false, columns: 3 });

    render(<SettingsLayout initialSelectedId="does-not-exist" navContext={navContext} />);

    expect(screen.getByText("Track panel content")).toBeInTheDocument();
  });

  test("hides the inline sidebar and opens a drawer from the hamburger button on mobile", async () => {
    mockUseScreenSize.mockReturnValue({ isMobile: true, isSmallerScreen: true, columns: 1 });

    render(<SettingsLayout initialSelectedId="integration" navContext={navContext} />);

    expect(screen.queryByTestId("settings-sidebar-desktop")).not.toBeInTheDocument();
    expect(screen.queryByTestId("settings-nav-item-logs")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open settings menu/i }));

    await waitFor(() => expect(screen.getByTestId("settings-nav-item-logs")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("settings-nav-item-logs"));

    await waitFor(() => expect(screen.getByText("Advanced panel content")).toBeInTheDocument());
  });
});
