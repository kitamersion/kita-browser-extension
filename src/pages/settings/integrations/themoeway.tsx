import { Box, Button, Flex, Heading, Input, InputGroup, InputRightElement, Text } from "@chakra-ui/react";
import React, { useMemo } from "react";
import LoadingState from "@/components/states/LoadingState";
import { useVideoContext } from "@/context/videoContext";
import { useTagContext } from "@/context/tagContext";
import { DEFAULT_TAGS } from "@/data/contants";
import EmptyState from "@/components/states/EmptyState";
import { filterVideos, getDateFromNow } from "@/utils";

const DAY_IN_DAYS = 3; // 3 days ago

const TheMoeWay = () => {
  const { isInitialized: isVideoContextInitialized, totalVideos } = useVideoContext();
  const { isInitialized: isTagContextInitialized, tags } = useTagContext();

  const theMoeWayTags = useMemo(() => {
    return tags.filter((tag) => tag.code && DEFAULT_TAGS.map((t) => t.code).includes(tag.code));
  }, [tags]);

  const videoItemsFromOneDay = useMemo(() => {
    const date = getDateFromNow(DAY_IN_DAYS);
    const filteredVideos = filterVideos(totalVideos, date);

    return filteredVideos.filter((video) => (video.tags ? video.tags : []));
  }, [totalVideos]);

  // @todo: group all tags under one record e.g anime = .log anime [number_of_videos]
  const videosByTag = useMemo(() => {
    return theMoeWayTags.map((tag) => ({
      tag,
      videos: videoItemsFromOneDay.filter((video) => video?.tags?.includes(tag.id ?? "") ?? []),
    }));
  }, [theMoeWayTags, videoItemsFromOneDay]);

  // todo: log rules

  if (!isVideoContextInitialized && !isTagContextInitialized) return <LoadingState />;

  return (
    <Box width={"full"} boxShadow={"dark-lg"} height={"500px"} rounded={"2xl"} p={4} overflowY={"auto"}>
      <Flex justifyContent={"space-between"} mb={4}>
        <Heading as="h2" fontWeight={"bold"} fontSize={"large"}>
          TheMoeWay
        </Heading>
        <Text>Display Required Tags - or - Notification</Text>
      </Flex>
      <Flex flexDirection={"column"} gap={4}>
        {videosByTag.length > 0 &&
          videosByTag.map(
            ({ tag, videos }) =>
              videos.length > 0 && (
                <Flex key={tag.id} flexDirection={"column"} gap={2}>
                  <Heading as="h3" fontWeight={"bold"} fontSize={"medium"}>
                    {tag.name}
                  </Heading>
                  <Flex flexDirection={"column"} gap={1}>
                    {videos.map((video) => (
                      <InputGroup size="md" key={video.id}>
                        <Input name="video_title" type="text" value={video.video_title} />
                        <InputRightElement width="4.5rem">
                          <Button variant="solid" h="1.75rem" size="sm" colorScheme="gray">
                            Copy
                          </Button>
                        </InputRightElement>
                      </InputGroup>
                    ))}
                  </Flex>
                </Flex>
              )
          )}
      </Flex>

      {videosByTag.length === 0 && <EmptyState />}
    </Box>
  );
};

export default TheMoeWay;
