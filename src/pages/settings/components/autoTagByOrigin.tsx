import { Button, FormControl, FormLabel, Select, Text, Box, Flex, Heading } from "@chakra-ui/react";
import React, { useState } from "react";
import { useTagContext } from "@/context/tagContext";
import LoadingState from "@/components/states/LoadingState";
import { IAutoTag } from "@/types/autotag";
import { SiteKey } from "@/types/video";
import { AUTO_TAG_ADD_OR_UPDATE } from "@/data/events";
import eventbus from "@/api/eventbus";

const TagItem = React.lazy(() => import("@/pages/settings/components/tagItem"));

type AutoTagGroupProps = {
  origin: string;
  autoTag?: IAutoTag;
};

const AutoTagByOrigin = ({ origin, autoTag }: AutoTagGroupProps) => {
  const { tags, isInitialized } = useTagContext();

  const intialState: IAutoTag = {
    id: autoTag?.id ?? window.crypto.randomUUID(),
    origin: autoTag?.origin ?? (origin as SiteKey),
    tags: autoTag?.tags ?? [],
  };

  const [newAutoTag, setNewAutoTag] = useState<IAutoTag>(intialState);

  const handleASaveAutoTag = () => {
    eventbus.publish(AUTO_TAG_ADD_OR_UPDATE, { message: "add or update auto tag", value: newAutoTag });
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewAutoTag((prevState) => ({
      ...prevState,
      tags: [...prevState.tags, e.target.value],
    }));
  };

  const handleRemoveTag = (tagId: string) => {
    setNewAutoTag((prevState) => ({
      ...prevState,
      tags: prevState.tags.filter((id) => id !== tagId),
    }));
  };

  if (!isInitialized) {
    return <LoadingState />;
  }
  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <Flex flexDirection={"column"} gap={8} alignItems={"flex-start"}>
        <Heading as="h2">{origin}</Heading>

        <FormControl>
          <FormLabel>Tags</FormLabel>
          <Select
            placeholder={
              tags.length !== newAutoTag.tags.length
                ? "Select tag to auto assign to origin"
                : "No tags found or all tags are assigned to this origin"
            }
            value={""}
            onChange={handleTagChange}
          >
            {tags
              .filter((tag) => !newAutoTag.tags.includes(tag?.id ?? ""))
              .map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
          </Select>
        </FormControl>
        <Button onClick={handleASaveAutoTag}>Save</Button>

        {newAutoTag && (
          <Flex gap={2} flexWrap={"wrap"} flexDirection={"column"}>
            <Text>{newAutoTag.origin}</Text>
            {newAutoTag.tags?.map((tagId) => (
              <Flex key={tagId} flexDirection={"row"}>
                <TagItem tag={tags.find((tag) => tag.id === tagId) ?? tags[0]} />
                <Button onClick={() => handleRemoveTag(tagId)}>Delete</Button>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Box>
  );
};

export default AutoTagByOrigin;
