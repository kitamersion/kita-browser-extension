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

  const anilistSyncComponent =
    !video.anilist_series_id && video.origin === SiteKey.CRUNCHYROLL ? <AnilistAnimeTrySearchAndLink {...video} /> : null;

  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} position="relative" zIndex={0} overflow="hidden" minH="200px">
      {/* Background Image - More Prominent */}
      <Box
        rounded={"2xl"}
        backgroundImage={`url('${backgroundImageUrl}')`}
        backgroundPosition="center"
        backgroundRepeat="no-repeat"
        backgroundSize="cover"
        opacity={0.4}
        position="absolute"
        top={0}
        bottom={0}
        right={0}
        left={0}
        zIndex={-1}
      />

      {/* Dark Gradient Overlay for better text readability */}
      <Box
        position="absolute"
        top={0}
        bottom={0}
        right={0}
        left={0}
        bg="linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)"
        zIndex={0}
      />

      {/* Top Row - AniList only */}
      {anilistSyncComponent && (
        <Box position="relative" zIndex={1} p={3}>
          {anilistSyncComponent}
        </Box>
      )}

      {/* Main Content Area - Bottom Half */}
      <Box position="relative" zIndex={1} mt="auto" p={4} pt={8}>
        {/* Title Section */}
        <Link href={video_url} isExternal display={"block"} mb={2}>
          <Text as="b" fontSize="lg" color="white" textShadow="2px 2px 4px rgba(0,0,0,0.8)" noOfLines={2}>
            {video_title}
          </Text>
        </Link>

        {/* Metadata Row */}
        <Flex gap={4} mb={3} flexWrap="wrap">
          <Flex gap={1} alignItems="center">
            <IoIosCalendar color="tomato" />
            <Text fontSize="sm" color="white" fontWeight="medium">
              {formatTimestamp(created_at)}
            </Text>
          </Flex>

          <Flex gap={1} alignItems="center">
            <IoTimerOutline color="tomato" />
            <Text fontSize="sm" color="white" fontWeight="medium">
              {formatDuration(video_duration)}
            </Text>
          </Flex>
        </Flex>

        {/* Tags Row */}
        <Flex gap={2} flexWrap={"wrap"} mb={3}>
          {renderTags.map((tag) => (
            <TagItem key={tag.id} tag={tag} size="sm" />
          ))}
        </Flex>

        {/* Bottom Row - Origin + Episode + Actions */}
        <Flex justifyContent={"space-between"} alignItems="center">
          <Flex alignItems={"center"} gap={2}>
            <OriginToIcon siteKey={origin} iconSize={16} />
            {video.watching_episode_number && (
              <Badge rounded={"xl"} px={3} py={1} bg="rgba(255, 99, 71, 0.9)" color="white" fontSize="xs" fontWeight="bold">
                EP {video.watching_episode_number}
              </Badge>
            )}
          </Flex>

          <Flex gap={2}>
            <UpdateVideo {...video} />
            <DeleteVideo id={id} />
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
};

export default VideoItem;
