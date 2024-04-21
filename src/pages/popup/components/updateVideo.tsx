import eventbus from "@/api/eventbus";
import { useTagContext } from "@/context/tagContext";
import { VIDEO_TAG_ADD_RELATIONSHIP, VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID, VIDEO_UPDATED_BY_ID } from "@/data/events";
import { IVideoTag } from "@/types/relationship";
import { IVideo, SiteKey } from "@/types/video";
import { convertToSeconds, formatDuration, settingsNavigation } from "@/utils";
import { v4 as uuidv4 } from "uuid";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Select,
  useColorMode,
  useDisclosure,
  Text,
  Checkbox,
  CheckboxGroup,
  Tag,
  TagLabel,
} from "@chakra-ui/react";
import React, { useState, useMemo, useCallback } from "react";
import { MdEdit } from "react-icons/md";
import { useVideoTagRelationshipContext } from "@/context/videoTagRelationshipContext";

const UpdateVideo = ({ id, origin, video_duration, video_title, created_at, video_url }: IVideo) => {
  const { tags: contextTags } = useTagContext();
  const { videoTagRelationship } = useVideoTagRelationshipContext();

  const selectedTagIdsForVideo = useMemo(() => {
    return videoTagRelationship.filter((relationship) => relationship.video_id === id).map((relationship) => relationship.tag_id);
  }, [id, videoTagRelationship]);

  const initialState: IVideo = useMemo(() => {
    return {
      id: id,
      origin: origin,
      video_duration: video_duration,
      video_title: video_title,
      created_at: created_at,
      video_url: video_url,
      tags: selectedTagIdsForVideo,
    };
  }, [created_at, id, origin, video_duration, video_title, video_url, selectedTagIdsForVideo]);
  const { colorMode } = useColorMode();
  const [video, setVideo] = useState(initialState);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // @todo move to utils + unit tests
  const durationSplit: number[] = formatDuration(video.video_duration)
    .split(" ")
    .map((item) => {
      const value = item.slice(0, -1);
      return parseInt(value);
    });

  const [hour, setHour] = useState<number>(durationSplit[0]);
  const [minute, setMinute] = useState(durationSplit[1]);
  const [second, setSecond] = useState(durationSplit[2]);

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    setHour(parseInt(value));
    handleDurationChange();
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    setMinute(parseInt(value));
    handleDurationChange();
  };

  const handleSecondChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    setSecond(parseInt(value));
    handleDurationChange();
  };

  const handleDurationChange = useCallback(() => {
    const formatDuration = `${hour}h ${minute}m ${second}s`;
    setVideo((prevVideo) => {
      return { ...prevVideo, video_duration: convertToSeconds(formatDuration) };
    });
  }, [hour, minute, second]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    const { name, value } = e.target;
    setVideo({ ...video, [name]: value });
  };

  const handleTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const tagId = event.target.value;
    const isChecked = event.target.checked;

    setVideo((prevVideo) => {
      let updatedTags;
      if (isChecked) {
        updatedTags = [...(prevVideo.tags ?? []), tagId]; // add checked
      } else {
        updatedTags = prevVideo.tags?.filter((tag) => tag !== tagId); // remove unchecked
      }
      return { ...prevVideo, tags: updatedTags };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedVideo = {
      ...video,
      updated_at: Date.now(),
    };
    eventbus.publish(VIDEO_UPDATED_BY_ID, { message: "updating video", value: updatedVideo });

    const relationshipToAdd = video.tags?.filter((tagId) => !selectedTagIdsForVideo.includes(tagId)) ?? [];
    const relationshipToRemove = selectedTagIdsForVideo.filter((tagId) => !video.tags?.includes(tagId)) ?? [];

    if (relationshipToAdd.length > 0) {
      const items: IVideoTag[] =
        video.tags?.map((tagId) => {
          return {
            id: uuidv4(),
            video_id: video.id,
            tag_id: tagId,
          };
        }) ?? [];
      eventbus.publish(VIDEO_TAG_ADD_RELATIONSHIP, { message: "video tag add relationship", value: items });
    }

    relationshipToRemove.forEach((tagId) => {
      eventbus.publish(VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID, { message: "video tag delete relationship", value: tagId });
    });

    onClose();
  };

  return (
    <>
      <IconButton icon={<MdEdit />} aria-label="Edit item" variant="ghost" rounded="full" title="Edit item" onClick={onOpen} />
      <Drawer onClose={onClose} isOpen={isOpen} size={"full"} placement={"bottom"}>
        <DrawerOverlay />
        <DrawerContent p="6" background={colorMode === "dark" ? "gray.800" : "white"}>
          <DrawerCloseButton />
          <DrawerHeader>Editing</DrawerHeader>
          <DrawerBody>
            <form onSubmit={handleSubmit}>
              <Flex flexDirection={"column"} gap={4}>
                <FormControl id="video_title">
                  <FormLabel>Video Title</FormLabel>
                  <Input isInvalid={!video.video_title} name="video_title" value={video.video_title} onChange={handleChange} />
                </FormControl>
                <FormControl id="video_url">
                  <FormLabel>Video URL</FormLabel>
                  <Input isInvalid={!video.video_url} name="video_url" value={video.video_url} onChange={handleChange} />
                </FormControl>
                <Flex gap={1}>
                  <FormControl id="video_duration_h">
                    <FormLabel>Hour</FormLabel>
                    <Input name="video_duration_h" type="number" min={0} value={hour} onChange={handleHourChange} />
                  </FormControl>
                  <FormControl id="video_duration_m">
                    <FormLabel>Min</FormLabel>
                    <Input name="video_duration_m" type="number" min={0} value={minute} onChange={handleMinuteChange} />
                  </FormControl>
                  <FormControl id="video_duration_s">
                    <FormLabel>Sec</FormLabel>
                    <Input name="video_duration_s" type="number" min={0} value={second} onChange={handleSecondChange} />
                  </FormControl>
                </Flex>
                <FormControl id="origin">
                  <FormLabel>Origin</FormLabel>
                  <Select isInvalid={!video.origin} name="origin" value={video.origin} onChange={handleChange}>
                    {Object.values(SiteKey).map((siteKey) => (
                      <option key={siteKey} value={siteKey}>
                        {siteKey}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl id="tags">
                  <FormLabel>Tags</FormLabel>
                  {contextTags.length === 0 && (
                    <Flex gap={1}>
                      <Text>No tags found. You can create tags in</Text>
                      <Button variant="link" onClick={settingsNavigation} aria-label="View settings page" title="View settings page">
                        settings page
                      </Button>
                    </Flex>
                  )}
                  {contextTags.length > 0 && (
                    <CheckboxGroup defaultValue={selectedTagIdsForVideo}>
                      {contextTags.map((tag) => (
                        <Tag m={1} size={"lg"} key={tag.id} borderRadius="full" variant="solid" colorScheme="red">
                          <Checkbox borderRadius={"10px"} name="tags" value={tag.id} onChange={handleTagChange}>
                            <TagLabel>{tag.name}</TagLabel>
                          </Checkbox>
                        </Tag>
                      ))}
                    </CheckboxGroup>
                  )}
                </FormControl>
                <Button mt={4} type="submit">
                  Save
                </Button>
              </Flex>
            </form>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default UpdateVideo;
