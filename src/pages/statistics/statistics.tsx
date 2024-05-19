import LoadingState from "@/components/states/LoadingState";
import useScreenSize from "@/hooks/useScreenSize";
import { Box, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import React, { Suspense } from "react";
import Summary from "./components/summary";
import VideoItemsBarChart from "./components/videoItemsBarChart";
import VideoDurationOverTimeAreaChart from "./components/videoDurationOverTimeAreaChart";
import { useVideoContext } from "@/context/videoContext";
import PaginatedVideoList from "./components/paginatedVideoList";

const Statistics = () => {
  const { columns } = useScreenSize();
  const { isInitialized: isVideoInitialized, totalVideoCount } = useVideoContext();

  if (!isVideoInitialized) {
    return <LoadingState />;
  }

  return (
    <Box as="main">
      <Suspense fallback={<LoadingState />}>
        <Summary />
        {totalVideoCount === 0 && (
          <Flex my={10} flexDirection={"column"} gap={2} alignItems={"center"}>
            <Heading as="h2" fontWeight={"bold"}>
              No videos found.
            </Heading>
            <Text fontSize={14} color={"tomato"}>
              Please provide data to visualize statistics
            </Text>
          </Flex>
        )}
        <Grid templateColumns={`repeat(${columns - 1}, 1fr)`} gap={4} mt={4} mx={2}>
          {totalVideoCount > 0 && (
            <>
              <VideoItemsBarChart />
              <VideoDurationOverTimeAreaChart />
            </>
          )}

          {/* @todo: provides no value, will consider future state  */}
          {/* {totalVideoCount > 0 && totalTagCount > 0 && <TagAssignedRadar />} */}
        </Grid>
        {totalVideoCount > 0 && <PaginatedVideoList />}
      </Suspense>
    </Box>
  );
};

export default Statistics;
