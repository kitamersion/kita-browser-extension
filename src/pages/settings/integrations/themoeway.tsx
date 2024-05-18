import { Box, Button, Flex, Heading, Input, Text, useClipboard } from "@chakra-ui/react";
import React, { useEffect, useMemo } from "react";
import LoadingState from "@/components/states/LoadingState";
import { useVideoContext } from "@/context/videoContext";
import { useTagContext } from "@/context/tagContext";
import { DEFAULT_TAGS } from "@/data/contants";
import EmptyState from "@/components/states/EmptyState";
import { filterVideos, getDateFromNow } from "@/utils";
import { IVideo } from "@/types/video";
import { ITag } from "@/types/tag";
import { useToastContext } from "@/context/toastNotificationContext";

const DAY_IN_DAYS = 1; // 1 day
const defaultTagCodes = new Set(DEFAULT_TAGS.map((t) => t.code));

const customTagMapping: Record<string, string> = {
  READING: "READTIME",
};

const filterTags = (tags: ITag[]) => tags.filter((tag) => tag.code && defaultTagCodes.has(tag.code));
const filterVideosByDate = (videos: IVideo[], date: Date) => filterVideos(videos, date).filter((video) => video.tags);
const mapTagsToLogMessage = (tags: ITag[], videos: IVideo[]) =>
  tags
    .map((tag) => {
      const videosForTag = videos.filter((video) => video?.tags?.includes(tag?.id || ""));
      if (videosForTag.length === 0) {
        return null;
      }
      const tagName = customTagMapping[tag?.code ?? ""] || tag.code;
      const inputLog = `.log ${tagName?.toLocaleLowerCase()} ${videosForTag.length}`;
      return {
        tag,
        logMessage: inputLog,
      };
    })
    .filter(Boolean);

const VideoInputGroup = ({ logMessage }: { logMessage?: string }) => {
  const { showToast } = useToastContext();
  const { hasCopied, onCopy } = useClipboard(logMessage ?? "");

  useEffect(() => {
    if (hasCopied) {
      showToast({
        title: "Copied log message!",
        status: "success",
      });
    }
  }, [hasCopied, showToast]);

  return (
    <Flex flexDirection={"row"} gap={1}>
      <Input name="video_title" type="text" value={logMessage} readOnly />
      <Button variant="solid" onClick={onCopy}>
        {hasCopied ? "Copied!" : "Copy"}
      </Button>
    </Flex>
  );
};

const TheMoeWay = () => {
  const { isInitialized: isVideoContextInitialized, totalVideos } = useVideoContext();
  const { isInitialized: isTagContextInitialized, tags } = useTagContext();

  const theMoeWayTags = useMemo(() => filterTags(tags), [tags]);
  const videoItemsFromOneDay = useMemo(() => filterVideosByDate(totalVideos, getDateFromNow(DAY_IN_DAYS)), [totalVideos]);
  const tagsToLogMessage = useMemo(() => mapTagsToLogMessage(theMoeWayTags, videoItemsFromOneDay), [theMoeWayTags, videoItemsFromOneDay]);

  if (!isVideoContextInitialized && !isTagContextInitialized) return <LoadingState />;

  return (
    <Box width={"full"} boxShadow={"dark-lg"} height={"500px"} rounded={"2xl"} p={4} overflowY={"auto"}>
      <Flex justifyContent={"space-between"} mb={4}>
        <Heading as="h2" fontWeight={"bold"} fontSize={"large"}>
          TheMoeWay
        </Heading>
        <Text>{DAY_IN_DAYS} Day</Text>
      </Flex>
      <Flex flexDirection={"column"} gap={4}>
        {tagsToLogMessage.length > 0 &&
          tagsToLogMessage.map((item) => (
            <Flex key={item?.tag.id} flexDirection={"column"} gap={2}>
              <Heading as="h3" fontWeight={"bold"} fontSize={"medium"}>
                {item?.tag.name}
              </Heading>
              <Flex flexDirection={"column"} gap={1}>
                <VideoInputGroup key={item?.tag.id} logMessage={item?.logMessage} />
              </Flex>
            </Flex>
          ))}
      </Flex>

      {tagsToLogMessage.length === 0 && <EmptyState />}
    </Box>
  );
};

export default TheMoeWay;
