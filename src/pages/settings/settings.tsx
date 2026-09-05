import React from "react";
import { useAnilistContext } from "@/context/anilistContext";
import { getSettingsSectionFromSearch } from "@/utils";
import SettingsLayout from "./components/settingsLayout";

const Settings = () => {
  const { anilistAuthStatus } = useAnilistContext();

  return <SettingsLayout initialSelectedId={getSettingsSectionFromSearch(window.location.search)} navContext={{ anilistAuthStatus }} />;
};

export default Settings;
