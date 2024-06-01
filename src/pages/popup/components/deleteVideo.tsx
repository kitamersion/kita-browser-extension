import eventbus from "@/api/eventbus";
import { VIDEO_DELETED_BY_ID } from "@/data/events";
import { IconButton } from "@chakra-ui/react";
import React from "react";
import { useCallback } from "react";
import { MdDelete } from "react-icons/md";

const DeleteVideo = ({ id }: { id: string }) => {
  const handleDeleteById = useCallback(() => {
    eventbus.publish(VIDEO_DELETED_BY_ID, { message: `Delete video ${id}`, value: { id: id } });
  }, [id]);

  return (
    <IconButton
      icon={<MdDelete />}
      aria-label="Delete item"
      colorScheme="red"
      variant="ghost"
      rounded="full"
      title="Delete item"
      onClick={handleDeleteById}
    />
  );
};

export default DeleteVideo;
