import { IVideo, SiteKey } from "@/types/video";
import { formatDuration, formatTimestamp } from "@/utils";
import { Box, Text, Flex, Link, Badge } from "@chakra-ui/react";
import React, { useMemo } from "react";
import OriginToIcon from "./originToIcon";
import UpdateVideo from "./updateVideo";
import { useTagContext } from "@/context/tagContext";
import TagItem from "@/pages/settings/components/tagItem";
import { ITag } from "@/types/tag";
import { IoTimerOutline } from "react-icons/io5";
import { IoIosCalendar } from "react-icons/io";
import { useVideoTagRelationshipContext } from "@/context/videoTagRelationshipContext";
import AnilistAnimeTrySearchAndLink from "@/pages/settings/components/anilist/anilistAnimeTrySearchAndLink";
import DeleteVideo from "./deleteVideo";
import MyAnimeListAnimeSync from "@/pages/settings/components/myanimelist/myanimelistAnimeSync";

const VideoItem = (video: IVideo) => {
  const { id, created_at, origin, video_duration, video_title, video_url } = video;
  const { tags: tagObject } = useTagContext();
  const { videoTagRelationship } = useVideoTagRelationshipContext();

  const selectedTagIdsForVideo = videoTagRelationship
    .filter((relationship) => relationship.video_id === video.id)
    .map((relationship) => relationship.tag_id);

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

  const backgroundImageUrl = useMemo(() => {
    return video.banner_image || video.background_cover_image || "";
  }, [video.background_cover_image, video.banner_image]);

  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} p={4} position="relative" zIndex={0}>
      <Box
        rounded={"2xl"}
        backgroundImage={`url('${backgroundImageUrl}')`}
        backgroundPosition="center"
        backgroundRepeat="no-repeat"
        backgroundSize="cover"
        opacity={0.2}
        position="absolute"
        top={0}
        bottom={0}
        right={0}
        left={0}
        zIndex={-1}
      />

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
            <Link p={2} href={video_url} isExternal display={"flex"} gap={1} alignItems={"center"}>
              <Text as="b">{video_title}</Text>
            </Link>
          </Flex>

          <Flex gap={1} flexWrap={"wrap"}>
            {renderTags.map((tag) => (
              <TagItem key={tag.id} tag={tag} size="sm" />
            ))}
          </Flex>

          <Flex justifyContent={"space-between"}>
            <Flex my={1} alignItems={"center"} gap={1}>
              <OriginToIcon siteKey={origin} iconSize={14} />
              {video.watching_episode_number && (
                <Badge rounded={"2xl"} px={2}>
                  EP {video.watching_episode_number}
                </Badge>
              )}
            </Flex>

            <Flex gap={1} justifyContent={"flex-end"}>
              {!video.anilist_series_id && video.origin === SiteKey.CRUNCHYROLL && <AnilistAnimeTrySearchAndLink {...video} />}
              {video.origin === SiteKey.CRUNCHYROLL && <MyAnimeListAnimeSync {...video} />}
              <UpdateVideo {...video} />
              <DeleteVideo id={id} />
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

export default VideoItem;
