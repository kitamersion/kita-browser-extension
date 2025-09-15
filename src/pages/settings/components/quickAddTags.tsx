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
    <Table variant="simple" size="sm">
      <Thead>
        <Tr>
          <Th>Tag Name</Th>
          <Th>Status</Th>
          <Th>Action</Th>
        </Tr>
      </Thead>
      <Tbody>
        {DEFAULT_TAGS.map((tag) => {
          const tagExists = hasTag(tag.code);
          const isMissing = isTagMissing(tag.code);

          return (
            <Tr key={tag.code}>
              <Td>{tag.name}</Td>
              <Td>{tagExists ? "✅" : "❌"}</Td>
              <Td>
                {isMissing && (
                  <Button size="xs" onClick={() => addMissingTag(tag.name)}>
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
