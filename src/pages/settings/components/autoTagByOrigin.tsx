import { Button, FormControl, Select, Text, Box, Flex, Badge, Tag, TagLabel, TagRightIcon } from "@chakra-ui/react";
import React, { useCallback, useMemo, useState } from "react";
import { useTagContext } from "@/context/tagContext";
import LoadingState from "@/components/states/LoadingState";
import { IAutoTag } from "@/types/autotag";
import { SiteKey } from "@/types/video";
import { AUTO_TAG_ADD_OR_UPDATE } from "@/data/events";
import eventbus from "@/api/eventbus";
import { MdDelete } from "react-icons/md";
import { IoIosPricetags } from "react-icons/io";

type AutoTagGroupProps = {
  origin?: string;
  autoTag?: IAutoTag;
};

const AutoTagByOrigin = ({ origin, autoTag }: AutoTagGroupProps) => {
  const { tags, isInitialized } = useTagContext();

  const intialState: IAutoTag = {
    id: autoTag?.id,
    origin: autoTag?.origin || (origin as SiteKey),
    tags: autoTag?.tags || [],
  };

  const [newAutoTag, setNewAutoTag] = useState<IAutoTag>(intialState);
  const [isChanged, setIsChanged] = useState(false);

  const handleASaveAutoTag = () => {
    eventbus.publish(AUTO_TAG_ADD_OR_UPDATE, { message: "add or update auto tag", value: newAutoTag });
    setIsChanged(false);
  };

  const handleTagChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewAutoTag((prevState) => ({
      ...prevState,
      tags: [...prevState.tags, e.target.value],
    }));
    setIsChanged(true);
  }, []);

  const handleRemoveTag = useCallback((tagId: string) => {
    setNewAutoTag((prevState) => ({
      ...prevState,
      tags: prevState.tags.filter((id) => id !== tagId),
    }));
    setIsChanged(true);
  }, []);

  const memoizedOptions = useMemo(() => {
    return tags
      .filter((tag) => !newAutoTag.tags.includes(tag?.id ?? ""))
      .map((tag) => (
        <option key={tag.id} value={tag.id}>
          {tag.name}
        </option>
      ));
  }, [tags, newAutoTag]);

  const memoizedTagItems = useMemo(() => {
    return newAutoTag.tags?.map((tagId) => {
      const tag = tags.find((tag) => tag.id === tagId);
      return tag ? (
        <Tag size={"lg"} key={tagId} borderRadius="full" variant="kita" colorScheme="red">
          <TagLabel>{tag.name}</TagLabel>
          <TagRightIcon
            as={MdDelete}
            cursor={"pointer"}
            aria-label={`Remove auto tag item from ${origin}`}
            p={0}
            ml={1}
            title={`Remove auto tag item from ${origin}`}
            onClick={() => handleRemoveTag(tagId)}
          />
        </Tag>
      ) : null;
    });
  }, [newAutoTag.tags, tags, origin, handleRemoveTag]);

  if (!isInitialized) {
    return <LoadingState />;
  }
  return (
    <Box
      width={"full"}
      boxShadow={"dark-lg"}
      rounded={"2xl"}
      p={4}
      bg="bg.secondary"
      border="1px solid"
      borderColor="border.primary"
      _hover={{
        borderColor: "border.accent",
        boxShadow: "2xl",
      }}
      transition="all 0.2s"
    >
      <Flex flexDirection={"column"} gap={4} px={2} my={2}>
        <Flex gap={1} flexDirection={"row"} justifyContent={"space-between"}>
          <Flex gap={1} alignItems={"center"}>
            <IoIosPricetags color="var(--chakra-colors-accent-primary)" />
            <Text fontSize={14} color="text.primary" fontWeight="medium">
              {origin}
            </Text>
          </Flex>
          {isChanged && (
            <Badge colorScheme="green" rounded={"2xl"} px={2} py={1} bg="green.500" color="white">
              Unsaved changes
            </Badge>
          )}
        </Flex>
        <Flex flexDirection={"row"} gap={2}>
          <FormControl>
            <Select
              rounded={"2xl"}
              placeholder={
                tags.length !== newAutoTag.tags.length
                  ? "Select tag to auto assign to origin"
                  : "No tags found or all tags are assigned to this origin"
              }
              value={""}
              onChange={handleTagChange}
              bg="bg.primary"
              borderColor="border.primary"
              color="text.primary"
              _hover={{ borderColor: "border.primary" }}
              _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
            >
              {memoizedOptions}
            </Select>
          </FormControl>
          <Button
            rounded={"2xl"}
            onClick={handleASaveAutoTag}
            bg="accent.primary"
            color="white"
            _hover={{ bg: "accent.primary", opacity: 0.9 }}
            _active={{ bg: "accent.primary", opacity: 0.8 }}
            isDisabled={!isChanged}
          >
            Save
          </Button>
        </Flex>

        {newAutoTag && (
          <Flex mt={2} gap={2} flexWrap={"wrap"} flexDirection={"row"}>
            {memoizedTagItems}
            {newAutoTag.tags.length === 0 && (
              <Text fontSize={14} color="text.secondary">
                No auto tags assigned
              </Text>
            )}
          </Flex>
        )}
      </Flex>
    </Box>
  );
};

export default AutoTagByOrigin;
