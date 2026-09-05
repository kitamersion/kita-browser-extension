import { Box, Button, Heading, VStack } from "@chakra-ui/react";
import React from "react";
import { SettingsNavContext, SettingsNavGroup } from "@/data/settingsNav";

export type SettingsSidebarProps = {
  groups: SettingsNavGroup[];
  selectedId: string;
  onSelect: (id: string) => void;
  navContext: SettingsNavContext;
};

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ groups, selectedId, onSelect, navContext }) => {
  return (
    <VStack as="nav" align="stretch" spacing={5} data-testid="settings-sidebar">
      {groups.map((group) => {
        const visibleItems = group.items.filter((item) => !item.condition || item.condition(navContext));

        if (visibleItems.length === 0) return null;

        return (
          <Box key={group.id}>
            <Heading size="xs" color="text.primary" textTransform="uppercase" py={2} px={2}>
              {group.label}
            </Heading>
            <VStack align="stretch" spacing={1} mt={2}>
              {visibleItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  justifyContent="flex-start"
                  borderLeft="3px solid"
                  borderRadius={0}
                  borderColor={item.id === selectedId ? "accent.primary" : "transparent"}
                  bg={item.id === selectedId ? "kita.primaryAlpha.100" : "transparent"}
                  color={item.id === selectedId ? "text.primary" : "text.secondary"}
                  _hover={{ bg: "kita.primaryAlpha.100" }}
                  onClick={() => onSelect(item.id)}
                  data-testid={`settings-nav-item-${item.id}`}
                >
                  {item.label}
                </Button>
              ))}
            </VStack>
          </Box>
        );
      })}
    </VStack>
  );
};

export default SettingsSidebar;
