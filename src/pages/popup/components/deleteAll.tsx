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
} from "@chakra-ui/react";
import React from "react";
import { MdDelete } from "react-icons/md";

const DeleteAll = () => {
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
        <DrawerOverlay bg="rgba(0, 0, 0, 0.8)" />
        <DrawerContent p="6" bg="bg.primary" border="1px solid" borderColor="border.primary" borderRadius="xl">
          <DrawerCloseButton color="text.secondary" />
          <DrawerHeader color="text.primary">Are you sure?</DrawerHeader>
          <DrawerBody>
            <Flex gap="6" flexDirection={"column"}>
              <Text color="text.secondary">
                This will delete all items! You will not be able to recover any items that are currently added.
              </Text>

              <Flex gap="2">
                <Button onClick={handleDeleteAll} bg="red.500" color="white" _hover={{ bg: "red.600" }} _active={{ bg: "red.700" }}>
                  Confirm
                </Button>
                <Button onClick={onClose} variant="ghost" color="text.secondary" _hover={{ bg: "bg.tertiary" }}>
                  Cancel
                </Button>
              </Flex>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default DeleteAll;
