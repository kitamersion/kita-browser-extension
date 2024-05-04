import LoadingState from "@/components/states/LoadingState";
import { useVideoContext } from "@/context/videoContext";
import { Box } from "@chakra-ui/react";
import React from "react";
import { ResponsiveContainer } from "recharts";

const bolierPlate = () => {
  const { isInitialized, totalVideos } = useVideoContext();

  if (!isInitialized) {
    return <LoadingState />;
  }

  return (
    <Box width={"full"} height={"500px"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <ResponsiveContainer width="100%" height="100%"></ResponsiveContainer>
    </Box>
  );
};

export default bolierPlate;
