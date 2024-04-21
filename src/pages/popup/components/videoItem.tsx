import { IVideo } from "@/types/video";
import { formatDuration, formatTimestamp } from "@/utils";
import { Box, Text, Flex, IconButton, Link } from "@chakra-ui/react";
import { MdDelete } from "react-icons/md";
import React, { useMemo } from "react";
import eventbus from "@/api/eventbus";
import { VIDEO_DELETED_BY_ID } from "@/data/events";
import OriginToIcon from "./originToIcon";
import UpdateVideo from "./updateVideo";
import { useTagContext } from "@/context/tagContext";
import TagItem from "@/pages/settings/components/tagItem";
import { ITag } from "@/types/tag";
import { IoTimerOutline } from "react-icons/io5";
import { IoIosCalendar } from "react-icons/io";
import { useVideoTagRelationshipContext } from "@/context/videoTagRelationshipContext";

const VideoItem = (video: IVideo) => {
  const { id, created_at, origin, video_duration, video_title, video_url } = video;
  const { tags: tagObject } = useTagContext();
  const { videoTagRelationship } = useVideoTagRelationshipContext();

  const selectedTagIdsForVideo = videoTagRelationship
    .filter((relationship) => relationship.video_id === video.id)
    .map((relationship) => relationship.tag_id);

  const handleDeleteById = (id: string) => {
    eventbus.publish(VIDEO_DELETED_BY_ID, { message: `Delete video ${id}`, value: { id: id } });
  };

  const renderTags = useMemo(() => {
    const matchingTag: ITag[] = [];
    selectedTagIdsForVideo?.map((t) => {
      const match = tagObject.find((tag) => tag.id === t);
      if (match) {
        matchingTag.push(match);
      }
    });
    return matchingTag;
  }, [selectedTagIdsForVideo, tagObject]);

  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <Flex width={"full"} flexDirection={"row"}>
        <Flex width={"full"} flexDirection={"column"} gap={1}>
          <Flex gap={1} justifyContent={"space-between"}>
            <Flex gap={1}>
              <IoIosCalendar color="tomato" />
              <Text fontSize={12} color={"tomato"}>
                {formatTimestamp(created_at)}
              </Text>
            </Flex>

            <Flex gap={1}>
              <IoTimerOutline color="tomato" />
              <Text fontSize={12} color={"tomato"}>
                {formatDuration(video_duration)}
              </Text>
            </Flex>
          </Flex>
          <Flex justifyContent={"space-between"}>
            <Flex alignItems={"center"}>
              <OriginToIcon siteKey={origin} />
              <Link p={2} href={video_url} isExternal display={"flex"} gap={1} alignItems={"center"}>
                <Text as="b">{video_title}</Text>
              </Link>
            </Flex>
            <Flex gap={1}>
              <UpdateVideo {...video} />
              <IconButton
                icon={<MdDelete />}
                aria-label="Delete item"
                colorScheme="red"
                variant="ghost"
                rounded="full"
                title="Delete item"
                onClick={() => handleDeleteById(id)}
              />
            </Flex>
          </Flex>
          <Flex gap={1} flexWrap={"wrap"}>
            {renderTags.map((tag) => (
              <TagItem key={tag.id} tag={tag} size="sm" />
            ))}
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

export default VideoItem;
