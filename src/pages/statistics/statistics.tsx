import LoadingState from "@/components/states/LoadingState";
import useScreenSize from "@/hooks/useScreenSize";
import { Box, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import React, { Suspense } from "react";
import { MdVideoLibrary } from "react-icons/md";
import Summary from "./components/summary";
import VideoItemsBarChart from "./components/videoItemsBarChart";
import VideoDurationOverTimeAreaChart from "./components/videoDurationOverTimeAreaChart";
import ActivityStreak from "./components/activityStreak";
import VideosByPlatform from "./components/videosByPlatform";
import { useVideoContext } from "@/context/videoContext";

const Statistics = () => {
  const { columns } = useScreenSize();
  const { isInitialized: isVideoInitialized, totalVideoCount } = useVideoContext();

  if (!isVideoInitialized) {
    return <LoadingState />;
  }

  return (
    <Box as="main" mx={4} mb={8}>
      <Suspense fallback={<LoadingState />}>
        <VStack spacing={4} align="stretch" mt={6} mb={2}>
          <Heading size="lg" color="accent.primary">
            Statistics
          </Heading>
          <Text color="text.secondary" fontSize="sm">
            An overview of your watch history and activity over time.
          </Text>
        </VStack>

        <Summary />

        {totalVideoCount === 0 ? (
          <Box bg="bg.secondary" border="1px solid" borderColor="border.primary" rounded="2xl" p={10} mt={6} textAlign="center">
            <Box as={MdVideoLibrary} boxSize={10} color="accent.primary" mx="auto" mb={4} />
            <Heading as="h2" size="md" color="text.primary" mb={2}>
              No videos found
            </Heading>
            <Text fontSize="sm" color="text.secondary">
              Start watching to see your statistics show up here.
            </Text>
          </Box>
        ) : (
          <VStack align="stretch" spacing={6} mt={6}>
            <ActivityStreak />
            <VideosByPlatform />
            <Grid templateColumns={`repeat(${columns - 1}, 1fr)`} gap={4}>
              <VideoItemsBarChart />
              <VideoDurationOverTimeAreaChart />
            </Grid>
          </VStack>
        )}
      </Suspense>
    </Box>
  );
};

export default Statistics;
