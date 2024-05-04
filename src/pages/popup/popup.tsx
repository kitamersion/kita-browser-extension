import React, { useMemo } from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import VideoItem from "./components/videoItem";
import useScreenSize from "@/hooks/useScreenSize";
import EmptyState from "@/components/states/EmptyState";
import LoadingState from "@/components/states/LoadingState";
import Summary from "./components/summary";
import FetchVideos from "./components/fetchVideos";
import DeleteAll from "./components/deleteAll";
import { useVideoContext } from "@/context/videoContext";
import AddVideoButton from "./components/addVideo";

const MAX_ITEMS_TO_SHOW = 12;

const PopUp = () => {
  const { isInitialized, totalVideos } = useVideoContext();
  const { columns } = useScreenSize();

  const latestTenVideos = useMemo(() => {
    return totalVideos.sort((a, b) => b.created_at - a.created_at).slice(0, MAX_ITEMS_TO_SHOW);
  }, [totalVideos]);

  if (!isInitialized) {
    return <LoadingState />;
  }

  return (
    <Box as="main" minHeight={"xl"}>
      <Flex justifyContent={"flex-end"}>
        <FetchVideos />
        <DeleteAll />
      </Flex>
      {latestTenVideos.length > 0 ? (
        <>
          <Summary />
          <Grid templateColumns={`repeat(${columns}, 1fr)`} gap={4} mt={4} mx={2}>
            {latestTenVideos.map((item) => (
              <VideoItem key={item.id} {...item} />
            ))}
          </Grid>
          <Flex alignItems={"center"} my={4} flexDirection={"column"}>
            <Text fontSize={12} color={"tomato"}>
              For performance, only showing the latest twelve items.
            </Text>
            <Text fontSize={12} color={"tomato"}>
              All item page coming soon...
            </Text>
          </Flex>
        </>
      ) : (
        <EmptyState />
      )}
      <AddVideoButton />
    </Box>
  );
};

export default PopUp;
