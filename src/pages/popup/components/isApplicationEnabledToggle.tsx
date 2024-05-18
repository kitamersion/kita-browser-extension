import LoadingState from "@/components/states/LoadingState";
import { useApplicationContext } from "@/context/applicationContext";
import { IconButton, Tooltip } from "@chakra-ui/react";
import React, { useCallback } from "react";
import eventBus from "@/api/eventbus";
import { CONTENT_SCRIPT_ENABLE } from "@/data/events";
import { FaPowerOff } from "react-icons/fa6";

const IsApplicationEnabledToggle = () => {
  const { isInitialized, isContentScriptEnabled } = useApplicationContext();

  const handleApplicationStatusChange = useCallback(() => {
    eventBus.publish(CONTENT_SCRIPT_ENABLE, { message: "updating content script enabled state", value: !isContentScriptEnabled });
  }, [isContentScriptEnabled]);

  if (!isInitialized) {
    <LoadingState />;
  }

  return (
    <Tooltip placement="bottom" label={`Click to turn ${isContentScriptEnabled ? "OFF" : "ON"}`} rounded={"full"}>
      <IconButton
        icon={<FaPowerOff color={isContentScriptEnabled ? "green" : "red"} />}
        variant="ghost"
        rounded="full"
        title={`Click to turn ${isContentScriptEnabled ? "OFF" : "ON"}`}
        aria-label={`Application is ${isContentScriptEnabled ? "OFF" : "ON"}`}
        onClick={handleApplicationStatusChange}
      />
    </Tooltip>
  );
};

export default IsApplicationEnabledToggle;
