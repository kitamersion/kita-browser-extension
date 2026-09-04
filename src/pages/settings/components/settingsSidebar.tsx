import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import React, { useState } from "react";
import { SettingsNavContext, SettingsNavGroup } from "@/data/settingsNav";

export type SettingsSidebarProps = {
  groups: SettingsNavGroup[];
  selectedId: string;
  onSelect: (id: string) => void;
  navContext: SettingsNavContext;
};

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ groups, selectedId, onSelect, navContext }) => {
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(
    () => new Set(groups.filter((group) => group.collapsedByDefault).map((group) => group.id))
  );

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <VStack as="nav" align="stretch" spacing={5} data-testid="settings-sidebar">
      {groups.map((group) => {
        const isCollapsed = collapsedGroupIds.has(group.id);
        const visibleItems = group.items.filter((item) => !item.condition || item.condition(navContext));

        if (visibleItems.length === 0) return null;

        return (
          <Box key={group.id}>
            <Button
              variant="ghost"
              width="full"
              height="auto"
              py={2}
              px={2}
              justifyContent="space-between"
              onClick={() => toggleGroup(group.id)}
              data-testid={`settings-nav-group-${group.id}-toggle`}
              rightIcon={isCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
            >
              <Box textAlign="left">
                <Heading size="xs" color={group.id === "advanced" ? "text.secondary" : "text.primary"} textTransform="uppercase">
                  {group.label}
                </Heading>
                <Text fontSize="xs" color="text.tertiary" fontWeight="normal" whiteSpace="normal">
                  {group.description}
                </Text>
              </Box>
            </Button>
            {!isCollapsed && (
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
            )}
          </Box>
        );
      })}
    </VStack>
  );
};

export default SettingsSidebar;
