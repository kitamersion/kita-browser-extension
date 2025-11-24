import eventbus from "@/api/eventbus";
import { useTagContext } from "@/context/tagContext";
import { VIDEO_TAG_ADD_RELATIONSHIP, VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID, VIDEO_UPDATED_BY_ID } from "@/data/events";
import { IVideoTag } from "@/types/relationship";
import { IVideo, SiteKey } from "@/types/video";
import { convertToSeconds, formatDuration, settingsNavigation } from "@/utils";
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
  useDisclosure,
  Text,
  Checkbox,
  CheckboxGroup,
  Tag,
  TagLabel,
  Box,
  Textarea,
} from "@chakra-ui/react";
import React, { useState, useMemo } from "react";
import { MdEdit } from "react-icons/md";
import { useVideoTagRelationshipContext } from "@/context/videoTagRelationshipContext";

const UpdateVideo = (videoBase: IVideo) => {
  const { id, origin, video_duration, video_title, created_at, video_url } = videoBase;
  const { tags: contextTags } = useTagContext();
  const { videoTagRelationship } = useVideoTagRelationshipContext();

  const selectedTagIdsForVideo = useMemo(() => {
    return videoTagRelationship.filter((relationship) => relationship.video_id === id).map((relationship) => relationship.tag_id);
  }, [id, videoTagRelationship]);

  const initialState: IVideo = useMemo(() => {
    return {
      ...videoBase,
      id: id,
      origin: origin,
      video_duration: video_duration,
      video_title: video_title,
      created_at: created_at,
      video_url: video_url,
      tags: selectedTagIdsForVideo,
    };
  }, [videoBase, id, origin, video_duration, video_title, created_at, video_url, selectedTagIdsForVideo]);
  const [video, setVideo] = useState(initialState);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const videoJsonBlob = useMemo(() => {
    return JSON.stringify(video, null, 2);
  }, [video]);

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
    const value = e.target.value ? e.target.value : "0";
    setHour(parseInt(value));
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? e.target.value : "0";
    setMinute(parseInt(value));
  };

  const handleSecondChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? e.target.value : "0";
    setSecond(parseInt(value));
  };

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

    const formatDuration = `${hour} ${minute} ${second}`;
    const updatedVideo = {
      ...video,
      updated_at: Date.now(),
      video_duration: convertToSeconds(formatDuration),
    };

    eventbus.publish(VIDEO_UPDATED_BY_ID, { message: "updating video", value: updatedVideo });

    const relationshipToAdd = video.tags?.filter((tagId) => !selectedTagIdsForVideo.includes(tagId)) ?? [];
    const relationshipToRemove = selectedTagIdsForVideo.filter((tagId) => !video.tags?.includes(tagId)) ?? [];

    if (relationshipToAdd.length > 0) {
      const items: IVideoTag[] = relationshipToAdd.map((tagId) => {
        return {
          id: self.crypto.randomUUID(),
          video_id: video.id,
          tag_id: tagId,
        };
      });
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
        <DrawerOverlay bg="blackAlpha.600" />
        <DrawerContent p="6" bg="bg.primary" color="text.primary">
          <DrawerCloseButton />
          <DrawerHeader color="accent.primary" fontSize="xl">
            Editing Video
          </DrawerHeader>
          <DrawerBody>
            <form onSubmit={handleSubmit}>
              <Flex flexDirection={"column"} gap={4}>
                <FormControl id="video_title">
                  <FormLabel color="text.secondary">Video Title</FormLabel>
                  <Input
                    isInvalid={!video.video_title}
                    name="video_title"
                    value={video.video_title}
                    onChange={handleChange}
                    bg="bg.secondary"
                    borderColor="border.primary"
                    color="text.primary"
                    _hover={{ borderColor: "border.primary" }}
                    _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
                  />
                </FormControl>
                <FormControl id="video_url">
                  <FormLabel color="text.secondary">Video URL</FormLabel>
                  <Input
                    isInvalid={!video.video_url}
                    name="video_url"
                    value={video.video_url}
                    onChange={handleChange}
                    bg="bg.secondary"
                    borderColor="border.primary"
                    color="text.primary"
                    _hover={{ borderColor: "border.primary" }}
                    _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
                  />
                </FormControl>
                <Flex gap={1}>
                  <FormControl id="video_duration_h">
                    <FormLabel color="text.secondary">Hour</FormLabel>
                    <Input
                      name="video_duration_h"
                      type="number"
                      min={0}
                      value={hour}
                      onChange={handleHourChange}
                      bg="bg.secondary"
                      borderColor="border.primary"
                      color="text.primary"
                      _hover={{ borderColor: "border.primary" }}
                      _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
                    />
                  </FormControl>
                  <FormControl id="video_duration_m">
                    <FormLabel color="text.secondary">Min</FormLabel>
                    <Input
                      name="video_duration_m"
                      type="number"
                      min={0}
                      value={minute}
                      onChange={handleMinuteChange}
                      bg="bg.secondary"
                      borderColor="border.primary"
                      color="text.primary"
                      _hover={{ borderColor: "border.primary" }}
                      _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
                    />
                  </FormControl>
                  <FormControl id="video_duration_s">
                    <FormLabel color="text.secondary">Sec</FormLabel>
                    <Input
                      name="video_duration_s"
                      type="number"
                      min={0}
                      value={second}
                      onChange={handleSecondChange}
                      bg="bg.secondary"
                      borderColor="border.primary"
                      color="text.primary"
                      _hover={{ borderColor: "border.primary" }}
                      _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
                    />
                  </FormControl>
                </Flex>
                <FormControl id="origin">
                  <FormLabel color="text.secondary">Origin</FormLabel>
                  <Select
                    isInvalid={!video.origin}
                    name="origin"
                    value={video.origin}
                    onChange={handleChange}
                    bg="bg.secondary"
                    borderColor="border.primary"
                    color="text.primary"
                    _hover={{ borderColor: "border.primary" }}
                    _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
                  >
                    {Object.values(SiteKey).map((siteKey) => (
                      <option key={siteKey} value={siteKey}>
                        {siteKey}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl id="tags">
                  <FormLabel color="text.secondary">Tags</FormLabel>
                  {contextTags.length === 0 && (
                    <Flex gap={1}>
                      <Text color="text.secondary">No tags found. You can create tags in</Text>
                      <Button
                        variant="link"
                        onClick={settingsNavigation}
                        aria-label="View settings page"
                        title="View settings page"
                        color="accent.primary"
                        _hover={{ color: "accent.primary", opacity: 0.8 }}
                      >
                        settings page
                      </Button>
                    </Flex>
                  )}
                  {contextTags.length > 0 && (
                    <CheckboxGroup defaultValue={selectedTagIdsForVideo}>
                      {contextTags.map((tag) => (
                        <Tag m={1} size={"lg"} key={tag.id} borderRadius="full" variant="kita" colorScheme="red">
                          <Checkbox
                            borderRadius={"10px"}
                            name="tags"
                            value={tag.id}
                            onChange={handleTagChange}
                            colorScheme="orange"
                            sx={{
                              ".chakra-checkbox__control": {
                                bg: "bg.tertiary",
                                borderColor: "border.primary",
                                _checked: {
                                  bg: "accent.primary",
                                  borderColor: "accent.primary",
                                },
                              },
                            }}
                          >
                            <TagLabel color="text.primary">{tag.name}</TagLabel>
                          </Checkbox>
                        </Tag>
                      ))}
                    </CheckboxGroup>
                  )}
                </FormControl>
                <Button
                  mt={4}
                  type="submit"
                  bg="accent.primary"
                  color="white"
                  _hover={{ bg: "accent.primary", opacity: 0.9 }}
                  _active={{ bg: "accent.primary", opacity: 0.8 }}
                >
                  Save
                </Button>
              </Flex>
            </form>
            <Box width={"full"} my={5}>
              <Text color="text.secondary" fontSize="sm" mb={2}>
                JSON blob for debugging and transparency
              </Text>
              <Textarea
                value={videoJsonBlob}
                mb="4"
                minHeight={"200px"}
                onChange={() => {}}
                bg="bg.secondary"
                borderColor="border.primary"
                color="text.primary"
                fontSize="sm"
                fontFamily="mono"
                _hover={{ borderColor: "border.primary" }}
                _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
                readOnly
              />
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default UpdateVideo;
