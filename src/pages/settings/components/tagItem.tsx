import eventbus from "@/api/eventbus";
import { TAG_DELETE_BY_ID } from "@/data/events";
import { ITag } from "@/types/tag";
import { Tag, TagLabel, TagCloseButton } from "@chakra-ui/react";
import React from "react";

const TagItem = ({ id, name }: ITag) => {
  const handleDeleteById = () => {
    eventbus.publish(TAG_DELETE_BY_ID, { message: `Delete tag ${id}`, value: { id: id } });
  };

  return (
    <Tag size={"lg"} key={id} borderRadius="full" variant="solid" colorScheme="red">
      <TagLabel>{name}</TagLabel>
      <TagCloseButton onClick={handleDeleteById} />
    </Tag>
  );
};

export default TagItem;
