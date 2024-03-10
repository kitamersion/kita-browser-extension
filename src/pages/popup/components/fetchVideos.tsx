import eventbus from "@/api/eventbus";
import { VIDEO_REFRESH } from "@/data/events";
import { IconButton } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { FaRegCirclePlay } from "react-icons/fa6";
import { FaRegStopCircle } from "react-icons/fa";

const FetchVideos = () => {
  const [isPolling, setIsPolling] = useState(false);

  const startPolling = () => {
    setIsPolling(true);
  };

  const stopPolling = () => {
    setIsPolling(false);
  };

  useEffect(() => {
    if (!isPolling) {
      return;
    }

    const intervalId = setInterval(handleRefreshData, 10000);
    return () => clearInterval(intervalId);
  }, [isPolling]);

  const handleRefreshData = () => {
    eventbus.publish(VIDEO_REFRESH, { message: "Refresh video data", value: {} });
  };
  return (
    <IconButton
      icon={isPolling ? <FaRegStopCircle /> : <FaRegCirclePlay />}
      aria-label={isPolling ? "Stop polling data refresh" : "Start polling data refresh"}
      variant="ghost"
      rounded="full"
      title={isPolling ? "Stop polling data refresh" : "Start polling data refresh"}
      onClick={isPolling ? stopPolling : startPolling}
    />
  );
};

export default FetchVideos;
