import React from "react";
import { IconButton } from "@chakra-ui/react";
import { IoIosStats } from "react-icons/io";
import { statisticsNavigation } from "@/utils";

const StatisticsButton = () => {
  return (
    <IconButton
      icon={<IoIosStats />}
      aria-label="Statistics"
      variant="ghost"
      rounded="full"
      title="View statistics page"
      onClick={statisticsNavigation}
    />
  );
};

export default StatisticsButton;
