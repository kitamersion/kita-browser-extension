import React, { useState, useEffect, useCallback } from "react";
import { IVideo } from "@/content"; // Ensure correct import path for IVideo
import { Box, Button, Editable, EditableInput, EditablePreview, Flex, Link, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

const HomePage = () => {
  const [totalVideos, setTotalVideos] = useState<IVideo[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  const calcualteTotalDuration = useCallback(() => {
    const totalTimeInSeconds = totalVideos.reduce((total, video) => total + video.video_duration, 0);
    setTotalDuration(totalTimeInSeconds);
  }, [totalVideos]);

  useEffect(() => {
    chrome.storage.local.get("video_items", function (data) {
      const videoData: IVideo[] = data.video_items || [];
      setTotalVideos(videoData);
      calcualteTotalDuration();
    });
  }, [calcualteTotalDuration]);

  const deleteVideoById = (id: string) => {
    const updatedVideos = totalVideos.filter((video) => video.id !== id);
    updateVideoData(updatedVideos);
  };

  const updateVideoData = (updatedVideos: IVideo[]) => {
    chrome.storage.local.set({ video_items: updatedVideos }, function () {
      setTotalVideos(updatedVideos);
      calcualteTotalDuration();
    });
  };

  const deleteAllVideos = () => {
    chrome.storage.local.remove("video_items", function () {
      setTotalVideos([]);
      setTotalDuration(0);
    });
  };

  const updateVideoById = (id: string, nextValue: string) => {
    const updatedVideos = totalVideos.map((video) => {
      if (video.id === id) {
        const duration = nextValue.split(" ")[0].trim();
        return { ...video, video_duration: Number(duration) };
      }
      return video;
    });

    chrome.storage.local.set({ video_items: updatedVideos }, function () {
      setTotalVideos(updatedVideos);
      calcualteTotalDuration();
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Box px={16} pb={6}>
      <Flex flexDirection={"column"} alignItems={"center"} gap={2}>
        <Button onClick={deleteAllVideos}>Delete All Video Data</Button>
        <Text>Total Items: {totalVideos.length}</Text>
        <Text>Total Duration: {formatTime(totalDuration)}</Text>
      </Flex>
      <Flex flexDirection={"column"} gap={"4"}>
        {totalVideos.map((video) => (
          <Flex flexDirection={"column"} key={video.id} border={"1px"} rounded={"2xl"} p="4">
            <Text>ID: {video.id}</Text>
            <Flex gap={1}>
              <Text>Title:</Text>
              <Box title={video.video_title} maxWidth="650px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                {video.video_title}
              </Box>
            </Flex>
            <Flex gap={1}>
              <Text>Duration:</Text>
              <Editable
                onChange={(nextValue) => updateVideoById(video.id, nextValue)}
                defaultValue={video.video_duration.toString() + " seconds"}
              >
                <EditablePreview />
                <EditableInput />
              </Editable>
            </Flex>
            <Flex gap={1}>
              <Text>URL:</Text>
              <Link
                maxWidth="650px"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                href={video.video_url}
                isExternal
                target="_blank"
              >
                <ExternalLinkIcon mx="2px" /> {video.video_url}
              </Link>
            </Flex>
            <Text>ORIGIN: {video.origin}</Text>
            <Text>Created At: {video.created_at}</Text>
            <Button onClick={() => deleteVideoById(video.id)}>Delete</Button>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};

export default HomePage;
