import React from "react";
import { IconButton } from "@chakra-ui/react";
import { IoMdSettings } from "react-icons/io";
import { settingsNavigation } from "@/utils";

const SettingsButton = () => {
  return (
    <IconButton
      icon={<IoMdSettings />}
      aria-label="Settings"
      variant="ghost"
      rounded="full"
      title="View settings page"
      onClick={settingsNavigation}
    />
  );
};

export default SettingsButton;
