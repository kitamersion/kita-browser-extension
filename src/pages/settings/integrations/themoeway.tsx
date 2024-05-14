import { Box, Heading } from "@chakra-ui/react";
import React from "react";
import LoadingState from "@/components/states/LoadingState";
import { useVideoContext } from "@/context/videoContext";
import { useTagContext } from "@/context/tagContext";

const TheMoeWay = () => {
  const { isInitialized: isVideoContextInitialized } = useVideoContext();
  const { isInitialized: isTagContextInitialized } = useTagContext();

  if (!isVideoContextInitialized && !isTagContextInitialized) return <LoadingState />;

  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <Heading as="h2" fontWeight={"bold"} fontSize={"large"}>
        TheMoeWay
      </Heading>
    </Box>
  );
};

export default TheMoeWay;
