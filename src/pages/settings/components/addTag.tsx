import eventbus from "@/api/eventbus";
import { TAG_SET } from "@/data/events";
import { Flex, Input, Button } from "@chakra-ui/react";
import React, { useState } from "react";

const AddTag = () => {
  const [tagName, setTagName] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagName(e.target.value);
  };

  const handleSetTag = () => {
    eventbus.publish(TAG_SET, { message: "Set tag", value: { name: tagName } });
    setTagName("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSetTag();
    }
  };

  return (
    <Flex flexDirection={"column"} gap={4} width={"full"}>
      <Input
        rounded={"2xl"}
        placeholder="Enter tag name"
        value={tagName}
        onChange={(e) => handleInputChange(e)}
        onKeyDown={(e) => handleKeyPress(e)}
      />
      <Button rounded={"2xl"} onClick={handleSetTag}>
        Add Tag
      </Button>
    </Flex>
  );
};

export default AddTag;
