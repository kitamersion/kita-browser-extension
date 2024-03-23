import LoadingState from "@/components/states/LoadingState";
import { useApplicationContext } from "@/context/applicationContext";
import { Button, Tooltip } from "@chakra-ui/react";
import React, { useCallback } from "react";
import eventBus from "@/api/eventbus";
import { APPLICATION_ENABLE } from "@/data/events";

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
      <Button
        title={`Click to turn ${isApplicationEnabled ? "OFF" : "ON"}`}
        aria-label={`Application is ${isApplicationEnabled ? "OFF" : "ON"}`}
        size={"xs"}
        rounded={"full"}
        onClick={handleApplicationStatusChange}
        colorScheme={isApplicationEnabled ? "green" : "red"}
      >
        Status: {isApplicationEnabled ? "ON" : "OFF"}
      </Button>
    </Tooltip>
  );
};

export default IsApplicationEnabledToggle;
