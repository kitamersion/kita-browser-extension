import eventbus from "@/api/eventbus";
import { useTagContext } from "@/context/tagContext";
import { DEFAULT_TAGS } from "@/data/contants";
import { TAG_SET } from "@/data/events";
import { Table, Thead, Tr, Th, Tbody, Td, Button, Flex } from "@chakra-ui/react";
import React, { useCallback, useMemo } from "react";
import { IoMdAdd } from "react-icons/io";

const QuickAddTags = () => {
  const { tags, isInitialized } = useTagContext();

  const addMissingTag = useCallback((tagName: string) => {
    eventbus.publish(TAG_SET, { message: "Set tag", value: { name: tagName } });
  }, []);

  // Memoize missing tags to avoid recalculating on every render
  const missingTags = useMemo(() => {
    if (!isInitialized || !tags) return [];

    return DEFAULT_TAGS.filter((defaultTag) => !tags.some((userTag) => userTag.code === defaultTag.code));
  }, [isInitialized, tags]);

  // Early return for loading state
  if (!isInitialized) {
    return null;
  }

  // Early return if no missing tags
  if (missingTags.length === 0) {
    return null;
  }

  const isTagMissing = (tagCode: string) => {
    return missingTags.some((tag) => tag.code === tagCode);
  };

  const hasTag = (tagCode: string) => {
    return tags?.some((tag) => tag.code === tagCode) ?? false;
  };

  return (
    <Table variant="simple" size="sm" bg="bg.primary" borderRadius="lg">
      <Thead>
        <Tr>
          <Th color="text.secondary" borderColor="border.primary">
            Tag Name
          </Th>
          <Th color="text.secondary" borderColor="border.primary">
            Status
          </Th>
          <Th color="text.secondary" borderColor="border.primary">
            Action
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {DEFAULT_TAGS.map((tag) => {
          const tagExists = hasTag(tag.code);
          const isMissing = isTagMissing(tag.code);

          return (
            <Tr key={tag.code}>
              <Td color="text.primary" borderColor="border.primary">
                {tag.name}
              </Td>
              <Td color="text.primary" borderColor="border.primary">
                {tagExists ? "✅" : "❌"}
              </Td>
              <Td borderColor="border.primary">
                {isMissing && (
                  <Button
                    size="xs"
                    onClick={() => addMissingTag(tag.name)}
                    bg="accent.primary"
                    color="white"
                    _hover={{ bg: "accent.primary", opacity: 0.9 }}
                    _active={{ bg: "accent.primary", opacity: 0.8 }}
                  >
                    <Flex gap={1} alignItems="center">
                      <IoMdAdd />
                      Add tag
                    </Flex>
                  </Button>
                )}
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};

export default QuickAddTags;
