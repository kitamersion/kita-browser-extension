import React from "react";
import { Flex, Heading } from "@chakra-ui/react";
import { ActionItems } from "@/data/routes";
import { nanoid } from "nanoid";
import { TITLE } from "@/data/contants";

const Navigation = () => {
  const renderActionItems = () => {
    return ActionItems.map((action) => action.component && <action.component key={nanoid()} />);
  };

  return (
    <Flex as="header" align="center" alignContent="center" justify="space-between" px={8} py={4}>
      <Heading fontSize="medium">{TITLE}</Heading>

      <Flex>{renderActionItems()}</Flex>
    </Flex>
  );
};

export default Navigation;
