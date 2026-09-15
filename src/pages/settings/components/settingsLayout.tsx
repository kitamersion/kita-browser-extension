import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Heading,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import React, { Suspense, useEffect, useState } from "react";
import LoadingState from "@/components/states/LoadingState";
import useScreenSize from "@/hooks/useScreenSize";
import eventbus from "@/api/eventbus";
import { getVisibleItems, SETTINGS_GROUPS, SETTINGS_NAVIGATE, SettingsNavContext } from "@/data/settingsNav";
import SettingsSidebar from "./settingsSidebar";

export type SettingsLayoutProps = {
  initialSelectedId: string;
  navContext: SettingsNavContext;
};

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ initialSelectedId, navContext }) => {
  const { isMobile, isSmallerScreen } = useScreenSize();
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const visibleItems = getVisibleItems(SETTINGS_GROUPS, navContext);
  const activeItem = visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0];

  useEffect(() => {
    const handleNavigate = (data: { value?: { id?: string } }) => {
      const targetId = data?.value?.id;
      if (targetId && visibleItems.some((item) => item.id === targetId)) {
        setSelectedId(targetId);
        onClose();
      }
    };
    eventbus.subscribe(SETTINGS_NAVIGATE, handleNavigate);
    return () => eventbus.unsubscribe(SETTINGS_NAVIGATE, handleNavigate);
  }, [visibleItems, onClose]);

  if (!activeItem) return null;
  const SelectedComponent = activeItem.component;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onClose();
  };

  return (
    <Flex as="main" direction={isMobile ? "column" : "row"} align="stretch" minH="100vh">
      {!isMobile && (
        <Box
          as="aside"
          width={isSmallerScreen ? "204px" : "244px"}
          flexShrink={0}
          bg="bg.secondary"
          p={4}
          data-testid="settings-sidebar-desktop"
        >
          <SettingsSidebar groups={SETTINGS_GROUPS} selectedId={activeItem.id} onSelect={handleSelect} navContext={navContext} />
        </Box>
      )}

      {isMobile && (
        <Flex as="header" align="center" gap={2} p={3} bg="bg.secondary" position="sticky" top={0} zIndex={1}>
          <IconButton aria-label="Open settings menu" icon={<HamburgerIcon />} onClick={onOpen} variant="ghost" />
          <Heading size="sm" color="text.primary">
            {activeItem.label}
          </Heading>
        </Flex>
      )}

      <Drawer isOpen={isMobile && isOpen} onClose={onClose} placement="left">
        <DrawerOverlay />
        <DrawerContent bg="bg.primary" color="text.primary">
          <DrawerCloseButton />
          <DrawerBody pt={10}>
            <SettingsSidebar groups={SETTINGS_GROUPS} selectedId={activeItem.id} onSelect={handleSelect} navContext={navContext} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Box as="section" flex="1" bg="bg.primary" color="text.primary" p={6} data-testid="settings-content">
        <Suspense fallback={<LoadingState />}>
          <SelectedComponent />
        </Suspense>
      </Box>
    </Flex>
  );
};

export default SettingsLayout;
