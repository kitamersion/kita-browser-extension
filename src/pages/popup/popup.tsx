import React from "react";
import { Box, Flex, Grid } from "@chakra-ui/react";
import VideoItem from "./components/videoItem";
import useScreenSize from "@/hooks/useScreenSize";
import EmptyState from "@/components/states/EmptyState";
import LoadingState from "@/components/states/LoadingState";
import Summary from "./components/summary";
import FetchVideos from "./components/fetchVideos";
import DeleteAll from "./components/deleteAll";
import { useVideoContext } from "@/context/videoContext";

const PopUp = () => {
  const { isInitialized, totalDuration, totalVideos } = useVideoContext();
  const { columns } = useScreenSize();

  if (!isInitialized) {
    return <LoadingState />;
  }

  return (
    <Box width={"full"} px={16} pb={6}>
      <Flex justifyContent={"space-between"} alignItems={"center"} gap={2}>
        <Summary duration={totalDuration} total={totalVideos.length} />
        <Flex gap={"2"}>
          <FetchVideos />
          <DeleteAll />
        </Flex>
      </Flex>

      {totalVideos.length > 0 ? (
        <Grid templateColumns={`repeat(${columns}, 1fr)`} gap={4} mt={4} mx={2}>
          {totalVideos.map((item) => (
            <VideoItem key={item.id} {...item} />
          ))}
        </Grid>
      ) : (
        <EmptyState />
      )}
    </Box>
  );
};

export default PopUp;
