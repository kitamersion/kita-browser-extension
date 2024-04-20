import { IVideo, SiteKey } from "@/types/video";
import { convertToSeconds, settingsNavigation } from "@/utils";
import eventbus from "@/api/eventbus";
import { v4 as uuidv4 } from "uuid";
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
  useColorMode,
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
  const { colorMode } = useColorMode();
  const { tags: contextTags } = useTagContext();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [video, setVideo] = useState(initialState);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const videoToAdd: IVideo = {
      ...video,
      id: uuidv4(),
      video_duration: convertToSeconds(video.video_duration.toString()),
    };

    const videoTagRelationship: IVideoTag[] = selectedTags.map((tagId) => {
      return {
        id: uuidv4(),
        video_id: videoToAdd.id,
        tag_id: tagId,
      };
    });

    eventbus.publish(VIDEO_ADD, { message: "add video", value: videoToAdd });
    eventbus.publish(VIDEO_TAG_ADD_RELATIONSHIP, { message: "video tag add relationship", value: videoTagRelationship });

    onClose();
  };

  return (
    <>
      <Box position="fixed" right="1em" bottom="1em">
        <IconButton isRound={true} aria-label="Add video" title="Add video" variant="solid" icon={<MdOutlineAdd />} onClick={onOpen} />
      </Box>
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
                  <Input name="video_title" value={video.video_title} onChange={handleChange} />
                </FormControl>
                <FormControl id="video_url">
                  <FormLabel>Video URL</FormLabel>
                  <Input name="video_url" value={video.video_url} onChange={handleChange} />
                </FormControl>
                <FormControl id="video_duration">
                  <FormLabel>Video Duration</FormLabel>
                  <Input name="video_duration" value={video.video_duration} onChange={handleChange} />
                </FormControl>
                <FormControl id="origin">
                  <FormLabel>Origin</FormLabel>
                  <Select name="origin" value={video.origin} onChange={handleChange}>
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

export default AddVideoButton;