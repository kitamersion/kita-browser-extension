import LoadingState from "@/components/states/LoadingState";
import useScreenSize from "@/hooks/useScreenSize";
import { Box, Grid } from "@chakra-ui/react";
import React, { Suspense } from "react";
import Summary from "./components/summary";
import VideoItemsBarChart from "./components/videoItemsBarChart";
import TagAssignedRadar from "./components/tagAssignedRadar";
import VideoDurationOverTimeAreaChart from "./components/videoDurationOverTimeAreaChart";

const Statistics = () => {
  const { columns } = useScreenSize();
  return (
    <Box as="main">
      <Suspense fallback={<LoadingState />}>
        <Summary />
        <Grid templateColumns={`repeat(${columns - 1}, 1fr)`} gap={4} mt={4} mx={2}>
          <VideoItemsBarChart />
          <VideoDurationOverTimeAreaChart />
          <TagAssignedRadar />
        </Grid>
      </Suspense>
    </Box>
  );
};

export default Statistics;
