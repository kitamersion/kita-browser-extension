import LoadingState from "@/components/states/LoadingState";
import { useApplicationContext } from "@/context/applicationContext";
import { IconButton, Tooltip } from "@chakra-ui/react";
import React, { useCallback } from "react";
import eventBus from "@/api/eventbus";
import { APPLICATION_ENABLE } from "@/data/events";
import { FaPowerOff } from "react-icons/fa6";

const IsApplicationEnabledToggle = () => {
  const { isInitialized, isApplicationEnabled } = useApplicationContext();

  const handleApplicationStatusChange = useCallback(() => {
    eventBus.publish(APPLICATION_ENABLE, { message: "updating application enabled state", value: !isApplicationEnabled });
  }, [isApplicationEnabled]);

  if (!isInitialized) {
    <LoadingState />;
  }

  return (
    <Tooltip placement="bottom" label={`Click to turn ${isApplicationEnabled ? "OFF" : "ON"}`} rounded={"full"}>
      <IconButton
        icon={<FaPowerOff color={isApplicationEnabled ? "green" : "red"} />}
        variant="ghost"
        rounded="full"
        title={`Click to turn ${isApplicationEnabled ? "OFF" : "ON"}`}
        aria-label={`Application is ${isApplicationEnabled ? "OFF" : "ON"}`}
        onClick={handleApplicationStatusChange}
      />
    </Tooltip>
  );
};

export default IsApplicationEnabledToggle;
