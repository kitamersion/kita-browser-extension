import React from "react";
import { Flex, Heading } from "@chakra-ui/react";
import { ActionItems } from "@/data/routes";
import { nanoid } from "nanoid";
import { TITLE } from "@/data/contants";
import IsApplicationEnabledToggle from "@/pages/popup/components/isApplicationEnabledToggle";

const Navigation = () => {
  const renderActionItems = () => {
    return ActionItems.map((action) => action.component && <action.component key={nanoid()} />);
  };

  return (
    <Flex as="nav" align="center" alignContent="center" justify="space-between" m={3} py={2} px={6}>
      <Flex alignItems={"center"} gap={2}>
        <Heading as={"h1"} fontSize="medium">
          {TITLE}
        </Heading>
        <IsApplicationEnabledToggle />
      </Flex>

      <Flex>{renderActionItems()}</Flex>
    </Flex>
  );
};

export default Navigation;
