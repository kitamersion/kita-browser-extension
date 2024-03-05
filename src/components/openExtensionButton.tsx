import { IconButton } from "@chakra-ui/react";
import { LuExternalLink } from "react-icons/lu";
import React from "react";

const OpenExtensionButton = () => {
  const openExtensionWindow = () => {
    chrome.windows.create({
      url: "index.html",
      type: "popup",
      width: 800,
      height: 600,
    });
  };

  return (
    <IconButton
      icon={<LuExternalLink />}
      aria-label="GitHub"
      variant="ghost"
      rounded="full"
      title="Popout extension window"
      onClick={openExtensionWindow}
    />
  );
};

export default OpenExtensionButton;
