import React, { useState, useEffect, useCallback } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { deleteAllVideos, deleteVideoById, getVideos } from "@/api";
import { formatTime } from "@/utils";
import { IVideo } from "@/types/video";

const HomePage = () => {
  const [totalVideos, setTotalVideos] = useState<IVideo[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

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

  const handleDeleteById = (id: string) => {
    deleteVideoById(id, totalVideos, (data) => {
      setTotalVideos(data);
      calcualteTotalDuration();
    });
  };

  const handleDeleteAllVideos = () => {
    deleteAllVideos(() => {
      setTotalVideos([]);
      setTotalDuration(0);
    });
  };

  return (
    <Box px={16} pb={6}>
      <Flex flexDirection={"column"} alignItems={"center"} gap={2}>
        <Button onClick={handleGetVideos}>Refetch Videos</Button>
        <Button onClick={handleDeleteAllVideos}>Delete All Video Data</Button>
        <Text>Total Items: {totalVideos.length}</Text>
        <Text>Total Duration: {formatTime(totalDuration)}</Text>
      </Flex>
      {totalVideos.map((video) => (
        <Box key={video.id} border={"1px"} rounded={"2xl"} p="4" mb="4">
          <Text>ID: {video.id}</Text>
          <Text>Title: {video.video_title}</Text>
          <Text>Duration: {formatTime(video.video_duration)}</Text>
          <Text>URL: {video.video_url}</Text>
          <Text>Origin: {video.origin}</Text>
          <Text>Created At: {video.created_at}</Text>
          <Button onClick={() => handleDeleteById(video.id)}>Delete</Button>
        </Box>
      ))}
    </Box>
  );
};

export default HomePage;
