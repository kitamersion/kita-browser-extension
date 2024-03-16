import eventbus from "@/api/eventbus";
import { VIDEO_DELETE_ALL } from "@/data/events";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  IconButton,
  useDisclosure,
  Text,
  Button,
  useColorMode,
} from "@chakra-ui/react";
import React from "react";
import { MdDelete } from "react-icons/md";

const DeleteAll = () => {
  const { colorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleDeleteAll = () => {
    eventbus.publish(VIDEO_DELETE_ALL, { message: "Delete all video items", value: {} });
    onClose();
  };
  return (
    <>
      <IconButton
        icon={<MdDelete />}
        aria-label="Delete all"
        colorScheme="red"
        variant="ghost"
        rounded="full"
        title="Delete all"
        onClick={onOpen}
      />
      <Drawer onClose={onClose} isOpen={isOpen} size={"full"} placement={"bottom"}>
        <DrawerOverlay />
        <DrawerContent p="6" background={colorMode === "dark" ? "gray.800" : "white"}>
          <DrawerCloseButton />
          <DrawerHeader>Are you sure?</DrawerHeader>
          <DrawerBody>
            <Flex gap="6" flexDirection={"column"}>
              <Text>This will delete all items! You will not be able to recover any items that are currently added.</Text>

              <Flex gap="2">
                <Button onClick={handleDeleteAll}>Confirm</Button>
                <Button onClick={onClose}>Cancel</Button>
              </Flex>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default DeleteAll;
