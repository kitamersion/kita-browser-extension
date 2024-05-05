import { Flex, Text } from "@chakra-ui/react";
import React, { PropsWithChildren } from "react";

const SummaryItem = ({ children }: PropsWithChildren<any>) => {
  return (
    <Flex flexDirection={"column"} rounded={"2xl"} p={4} alignItems={"center"} boxShadow={"dark-lg"}>
      {children}
    </Flex>
  );
};

SummaryItem.Value = function SummaryItemValue({ value }: { value: string | number }) {
  return <Text as={"b"}>{value}</Text>;
};

SummaryItem.Title = function SummaryItemTitle({ children }: PropsWithChildren<any>) {
  return (
    <Text fontSize={12} color={"tomato"}>
      {children}
    </Text>
  );
};

export default SummaryItem;
