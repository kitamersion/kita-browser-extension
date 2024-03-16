import eventbus from "@/api/eventbus";
import { VIDEO_UPDATED_BY_ID } from "@/data/events";
import { IVideo, SiteKey } from "@/types/video";
import { convertToSeconds, formatDuration } from "@/utils";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Select,
  useColorMode,
  useDisclosure,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    const { name, value } = e.target;
    if (!value) {
      setIsInvalid(true);
    } else {
      setIsInvalid(false);
    }
    setVideo({
      ...video,
      [name]: value,
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
              <Button mt={4} type="submit" isDisabled={!isChanged || isInvalid}>
                Update Video
              </Button>
            </form>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default UpdateVideo;
