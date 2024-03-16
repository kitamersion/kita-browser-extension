import { IVideo } from "@/types/video";
import { formatDuration, formatTimestamp } from "@/utils";
import { Box, Text, Flex, IconButton, Link } from "@chakra-ui/react";
import { MdDelete } from "react-icons/md";
import React from "react";
import eventbus from "@/api/eventbus";
import { VIDEO_DELETED_BY_ID } from "@/data/events";
import OriginToIcon from "./originToIcon";
import UpdateVideo from "./updateVideo";

const VideoItem = (video: IVideo) => {
  const { id, created_at, origin, video_duration, video_title, video_url } = video;
  const handleDeleteById = (id: string) => {
    eventbus.publish(VIDEO_DELETED_BY_ID, { message: `Delete video ${id}`, value: { id: id } });
  };

  return (
    <Box width={"full"} border={"1px"} boxShadow={"md"} rounded={"2xl"} p="2">
      <Flex width={"full"} flexDirection={"row"}>
        <Flex width={"full"} flexDirection={"column"}>
          <Flex justifyContent={"space-between"}>
            <Flex alignItems={"center"}>
              <OriginToIcon siteKey={origin} />
              <Link p={2} href={video_url} isExternal display={"flex"} gap={1} alignItems={"center"}>
                <Text as="b">{video_title}</Text>
              </Link>
            </Flex>
            <Flex gap="1">
              <UpdateVideo {...video} />
              <IconButton
                icon={<MdDelete />}
                aria-label="Delete item"
                colorScheme="red"
                variant="ghost"
                rounded="full"
                title={`Delete item ${id}`}
                onClick={() => handleDeleteById(id)}
              />
            </Flex>
          </Flex>
          <Text>Duration: {formatDuration(video_duration)}</Text>
          <Text>Created At: {formatTimestamp(created_at)}</Text>
        </Flex>
      </Flex>
    </Box>
  );
};

export default VideoItem;
