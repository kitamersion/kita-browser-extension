import React, { useMemo } from "react";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import VideoItem from "./components/videoItem";
import useScreenSize from "@/hooks/useScreenSize";
import EmptyState from "@/components/states/EmptyState";
import LoadingState from "@/components/states/LoadingState";
import Summary from "./components/summary";
import FetchVideos from "./components/fetchVideos";
import DeleteAll from "./components/deleteAll";
import { useVideoContext } from "@/context/videoContext";
import AddVideoButton from "./components/addVideo";
import { statisticsNavigation } from "@/utils";

const MAX_ITEMS_TO_SHOW = 20;

const PopUp = () => {
  const { isInitialized, totalVideos } = useVideoContext();
  const { columns } = useScreenSize();

  const recentVideos = useMemo(() => {
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
      {recentVideos.length > 0 ? (
        <>
          <Summary />
          <Grid templateColumns={`repeat(${columns}, 1fr)`} gap={2} mt={4} mx={2}>
            {recentVideos.map((video) => (
              <VideoItem key={video.id} {...video} />
            ))}
          </Grid>
          <Flex alignItems={"center"} my={4} flexDirection={"column"}>
            <Text fontSize={12} color={"tomato"}>
              For performance, only showing the latest {MAX_ITEMS_TO_SHOW} items.
            </Text>

            <Button
              fontSize={12}
              color={"tomato"}
              variant="link"
              onClick={statisticsNavigation}
              aria-label="View statistics page"
              title="View statistics page"
            >
              View all items in statistics page
            </Button>
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
