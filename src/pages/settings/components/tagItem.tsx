import eventbus from "@/api/eventbus";
import { TAG_DELETE_BY_ID } from "@/data/events";
import { ITag } from "@/types/tag";
import { Tag, TagLabel, TagCloseButton } from "@chakra-ui/react";
import React from "react";

type ITagItem = {
  tag: ITag;
  size?: "sm" | "md" | "lg";
  showDelete?: boolean;
};
const TagItem = ({ tag, showDelete, size }: ITagItem) => {
  const { id, name } = tag;
  const handleDeleteById = () => {
    eventbus.publish(TAG_DELETE_BY_ID, { message: `Delete tag ${id}`, value: { id: id } });
  };

  return (
    <Tag size={size ?? "lg"} key={id} borderRadius="full" variant="solid" colorScheme="red">
      <TagLabel>{name}</TagLabel>
      {showDelete && <TagCloseButton onClick={handleDeleteById} />}
    </Tag>
  );
};

export default TagItem;
