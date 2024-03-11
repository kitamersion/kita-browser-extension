import React, { useCallback } from "react";
import { IconButton } from "@chakra-ui/react";
import { IoMdSettings } from "react-icons/io";

const ENV = process.env.APPLICATION_ENVIRONMENT;
const PAGE_NAME = "settings.html";

const SettingsButton = () => {
  const createTab = (url: string) => {
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url }, (tab) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(tab);
      });
    });
  };

  const settingsNavigation = useCallback(async () => {
    if (ENV === "dev") {
      window.open(PAGE_NAME, "_blank");
      return;
    }

    const settingsUrl = chrome.runtime.getURL(`/${PAGE_NAME}`);
    await createTab(settingsUrl);
  }, []);

  return (
    <IconButton
      icon={<IoMdSettings />}
      aria-label="GitHub"
      variant="ghost"
      rounded="full"
      title="View project on GitHub"
      onClick={settingsNavigation}
    />
  );
};

export default SettingsButton;
