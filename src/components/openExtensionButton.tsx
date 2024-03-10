import { IconButton } from "@chakra-ui/react";
import { LuExternalLink } from "react-icons/lu";
import React from "react";

const OpenExtensionButton = () => {
  const openExtensionWindow = () => {
    chrome.windows.create({
      url: "popup.html",
      type: "popup",
      width: 900,
      height: 640,
    });
  };

  return (
    <IconButton
      icon={<LuExternalLink />}
      aria-label="Popout extension window"
      variant="ghost"
      rounded="full"
      title="Popout extension window"
      onClick={openExtensionWindow}
    />
  );
};

export default OpenExtensionButton;
