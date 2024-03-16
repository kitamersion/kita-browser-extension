import eventbus from "@/api/eventbus";
import { useTagContext } from "@/context/tagContext";
import { VIDEO_UPDATED_BY_ID } from "@/data/events";
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
  useColorMode,
  useDisclosure,
  Text,
  Checkbox,
  CheckboxGroup,
  Tag,
  TagLabel,
} from "@chakra-ui/react";
import React, { useState, useEffect, useMemo } from "react";
import { MdEdit } from "react-icons/md";

const UpdateVideo = ({ id, origin, video_duration, video_title, created_at, video_url, tags }: IVideo) => {
  const initialState = useMemo(() => {
    return {
      id,
      origin,
      video_duration: formatDuration(video_duration),
      video_title,
      created_at,
      video_url,
      tags,
    };
  }, [created_at, id, origin, tags, video_duration, video_title, video_url]);
  const { colorMode } = useColorMode();
  const [video, setVideo] = useState(initialState);
  const [isChanged, setIsChanged] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { tags: contextTags } = useTagContext();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    const { name, value } = e.target;
    if (!value) {
      setIsInvalid(true);
    } else {
      setIsInvalid(false);
    }
    setVideo({ ...video, [name]: value });
  };

  const handleTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const tagId = event.target.value;
    const isChecked = event.target.checked;

    setVideo((prevVideo) => {
      let updatedTags;
      if (isChecked) {
        updatedTags = [...prevVideo.tags, tagId]; // add checked
      } else {
        updatedTags = prevVideo.tags.filter((tag) => tag !== tagId); // remove unchecked
      }
      return { ...prevVideo, tags: updatedTags };
    });
  };

  // enable button if record has changed
  useEffect(() => {
    setIsChanged(JSON.stringify(video) !== JSON.stringify(initialState));
  }, [initialState, video]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedVideo = {
      ...video,
      video_duration: convertToSeconds(video.video_duration),
    };
    eventbus.publish(VIDEO_UPDATED_BY_ID, { message: "Updating video", value: updatedVideo });
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
                <FormControl id="video_duration">
                  <FormLabel>Video Duration</FormLabel>
                  <Input isInvalid={!video.video_duration} name="video_duration" value={video.video_duration} onChange={handleChange} />
                </FormControl>
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
                    <CheckboxGroup defaultValue={video.tags}>
                      {contextTags.map((tag) => (
                        <Tag m={1} size={"lg"} key={tag.id} borderRadius="full" variant="solid" colorScheme="red">
                          <Checkbox borderRadius={"10px"} name="tags" value={tag.id} onChange={handleTagChange}>
                            <TagLabel> {tag.name}</TagLabel>
                          </Checkbox>
                        </Tag>
                      ))}
                    </CheckboxGroup>
                  )}
                </FormControl>
                <Button mt={4} type="submit" isDisabled={!isChanged || isInvalid}>
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
