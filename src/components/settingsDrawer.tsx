import {
  LOCAL_STORAGE_CONTEXT_MENU_SHOW_NOTIFICATION,
  LOCAL_STORAGE_WITH_BLOCK_COPY,
  LOCAL_STORAGE_WITH_QUOTES,
  TITLE,
} from "@/data/contants";
import useLocalStorage from "@/hooks/useLocalStorage";
import { MdOutlineSettings } from "react-icons/md";
import {
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
  Switch,
  useColorMode,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useCallback } from "react";

type ISettingsDrawers = {
  setWithQuotes: React.Dispatch<React.SetStateAction<boolean>>;
  setWithBlockCopy: React.Dispatch<React.SetStateAction<boolean>>;
};

const SettingsDrawer = ({ setWithQuotes, setWithBlockCopy }: ISettingsDrawers) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode } = useColorMode();
  const [withQuotesStorage, setWithQuotesStorage] = useLocalStorage<boolean | null>(LOCAL_STORAGE_WITH_QUOTES, true);
  const [WithBlockCopyStorage, setWithBlockCopyStorage] = useLocalStorage<boolean | null>(LOCAL_STORAGE_WITH_BLOCK_COPY, true);
  const [showNotificationFromContextMenu, setShowNotificationFromContextMenu] = useLocalStorage<boolean | null>(
    LOCAL_STORAGE_CONTEXT_MENU_SHOW_NOTIFICATION,
    true
  );

  const handleToggleQuotes = useCallback(() => {
    setWithQuotesStorage((prevValue) => (prevValue === null ? true : !prevValue));
    setWithQuotes((prevValue) => (prevValue === null ? true : !prevValue));
  }, [setWithQuotes, setWithQuotesStorage]);

  const handleToggleBlockCopy = useCallback(() => {
    setWithBlockCopyStorage((prevValue) => (prevValue === null ? true : !prevValue));
    setWithBlockCopy((prevValue) => (prevValue === null ? true : !prevValue));
  }, [setWithBlockCopyStorage, setWithBlockCopy]);

  const handleToggleContextMenuNotification = useCallback(() => {
    setShowNotificationFromContextMenu((prevValue) => (prevValue === null ? true : !prevValue));
  }, [setShowNotificationFromContextMenu]);

  return (
    <>
      <IconButton
        aria-label="Open settings menu"
        title="Open settings menu"
        icon={<MdOutlineSettings />}
        onClick={onOpen}
        variant="solid"
      />
      <Drawer onClose={onClose} isOpen={isOpen} size={"full"} placement="bottom">
        <DrawerOverlay />
        <DrawerContent pl={2} py={2} bg={colorMode === "light" ? "white" : "gray.900"}>
          <DrawerCloseButton />
          <DrawerHeader fontSize="medium">{TITLE}</DrawerHeader>
          <DrawerBody>
            <Flex flexDirection={"column"} alignItems={"center"} alignContent={"center"} py={"6"} gap={"4"}>
              <FormControl display={"flex"} alignItems={"center"} justifyContent={"flex-start"} gap="4">
                <Switch id="withQuotes" isChecked={withQuotesStorage ?? true} onChange={handleToggleQuotes} size="md" />
                <FormLabel htmlFor="withQuotes" mb="0">
                  Copy with quotes
                </FormLabel>
              </FormControl>
              <FormControl display={"flex"} alignItems={"center"} justifyContent={"flex-start"} gap="4">
                <Switch id="withBlockCopy" isChecked={WithBlockCopyStorage ?? true} onChange={handleToggleBlockCopy} size="md" />
                <FormLabel htmlFor="withBlockCopy" mb="0">
                  Copy as block text
                </FormLabel>
              </FormControl>
              <FormControl display={"flex"} alignItems={"center"} justifyContent={"flex-start"} gap="4">
                <Switch
                  id="withContextMenuNotification"
                  isChecked={showNotificationFromContextMenu ?? true}
                  onChange={handleToggleContextMenuNotification}
                  size="md"
                />
                <FormLabel htmlFor="withContextMenuNotification" mb="0">
                  Show notification for context menu
                </FormLabel>
              </FormControl>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default SettingsDrawer;
