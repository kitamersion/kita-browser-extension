import { IVideo, SiteKey } from "@/types/video";
import { convertToSeconds, settingsNavigation } from "@/utils";
import eventbus from "@/api/eventbus";
import {
  IconButton,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Tag,
  TagLabel,
  useDisclosure,
  Text,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { MdOutlineAdd } from "react-icons/md";
import { VIDEO_ADD, VIDEO_TAG_ADD_RELATIONSHIP } from "@/data/events";
import { useTagContext } from "@/context/tagContext";
import { IVideoTag } from "@/types/relationship";

const AddVideoButton = () => {
  const initialState: IVideo = {
    id: "",
    origin: SiteKey.YOUTUBE,
    video_duration: 0,
    video_title: "",
    created_at: 0,
    video_url: "",
    tags: [],
  };
  const { tags: contextTags } = useTagContext();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [video, setVideo] = useState(initialState);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [second, setSecond] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    const { name, value } = e.target;
    setVideo({ ...video, [name]: value });
  };

  const handleTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const tagId = event.target.value;
    const isChecked = event.target.checked;

    if (isChecked) {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formatDuration = `${hour} ${minute} ${second}`;

    const videoToAdd: IVideo = {
      ...video,
      id: self.crypto.randomUUID(),
      video_duration: convertToSeconds(formatDuration),
      created_at: Date.now(),
      tags: selectedTags,
    };

    const videoTagRelationship: IVideoTag[] = selectedTags.map((tagId) => {
      return {
        id: self.crypto.randomUUID(),
        video_id: videoToAdd.id,
        tag_id: tagId,
        created_at: Date.now(),
      };
    });

    eventbus.publish(VIDEO_ADD, { message: "add video", value: videoToAdd });
    eventbus.publish(VIDEO_TAG_ADD_RELATIONSHIP, { message: "video tag add relationship", value: videoTagRelationship });

    onClose();
    setVideo(initialState);
    setSelectedTags([]);
    setSecond(0);
    setMinute(0);
    setHour(0);
    setSelectedTags([]);
  };

  return (
    <>
      <Box position="fixed" right="1em" bottom="1em">
        <IconButton
          size={"md"}
          isRound={true}
          aria-label="Add video"
          title="Add video"
          bg="accent.primary"
          color="white"
          _hover={{ bg: "accent.primary", opacity: 0.9 }}
          _active={{ bg: "accent.primary", opacity: 0.8 }}
          icon={<MdOutlineAdd />}
          onClick={onOpen}
        />
      </Box>
      <Drawer onClose={onClose} isOpen={isOpen} size={"full"} placement={"bottom"}>
        <DrawerOverlay bg="blackAlpha.600" />
        <DrawerContent p="6" bg="bg.primary" color="text.primary">
          <DrawerCloseButton />
          <DrawerHeader color="accent.primary" fontSize="xl">
            Add Video
          </DrawerHeader>
          <DrawerBody>
            <form onSubmit={handleSubmit}>
              <Flex flexDirection={"column"} gap={4}>
                <FormControl id="video_title">
                  <FormLabel color="text.secondary">Video Title</FormLabel>
                  <Input
                    autoFocus
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
                    <CheckboxGroup defaultValue={video.tags}>
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
                            <TagLabel color="text.primary"> {tag.name}</TagLabel>
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
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default AddVideoButton;
