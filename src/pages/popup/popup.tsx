import React, { useState, useEffect, useCallback } from "react";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import { formatDuration } from "@/utils";
import { IVideo } from "@/types/video";
import { deleteAllVideos, deleteVideoById, getVideos } from "@/api/videostorage";
import eventBus, { CallbackFunction } from "@/api/eventbus";
import { VIDEO_DELETED_BY_ID_EVENT } from "@/data/events";
import VideoItem from "./components/videoItem";
import useScreenSize from "@/hooks/useScreenSize";
import EmptyState from "@/components/states/EmptyState";
import LoadingState from "@/components/states/LoadingState";

const PopUp = () => {
  const [totalVideos, setTotalVideos] = useState<IVideo[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const { columns } = useScreenSize();

  const calcualteTotalDuration = useCallback(() => {
    const totalTimeInSeconds = totalVideos.reduce((total, video) => total + video.video_duration, 0);
    setTotalDuration(totalTimeInSeconds);
  }, [totalVideos]);

  const handleGetVideos = useCallback(() => {
    getVideos((data) => {
      setTotalVideos(data);
      calcualteTotalDuration();
    });
  }, [calcualteTotalDuration]);

  useEffect(() => {
    if (!isInitialized) {
      handleGetVideos();
      return () => {
        setIsInitialized(true);
      };
    }
  }, [calcualteTotalDuration, handleGetVideos, isInitialized]);

  const handleDeleteAllVideos = () => {
    deleteAllVideos(() => {
      setTotalVideos([]);
      setTotalDuration(0);
    });
  };

  useEffect(() => {
    const handleCustomEvent: CallbackFunction = (eventData: any) => {
      const id = eventData.value.id;
      if (!id) {
        console.warn("No video id found from event handler");
        return;
      }
      deleteVideoById(id, totalVideos, (data) => {
        setTotalVideos(data);
        calcualteTotalDuration();
      });
    };

    eventBus.subscribe(VIDEO_DELETED_BY_ID_EVENT, handleCustomEvent);

    return () => {
      eventBus.unsubscribe(VIDEO_DELETED_BY_ID_EVENT, handleCustomEvent);
    };
  }, [calcualteTotalDuration, totalVideos]);

  if (!isInitialized) {
    return <LoadingState />;
  }

  return (
    <Box width={"full"} px={16} pb={6}>
      <Flex flexDirection={"column"} alignItems={"center"} gap={2}>
        <Button onClick={handleGetVideos}>Refetch Videos</Button>
        <Button onClick={handleDeleteAllVideos}>Delete All Video Data</Button>
        <Text>Total Items: {totalVideos.length}</Text>
        <Text>Total Duration: {formatDuration(totalDuration)}</Text>
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
