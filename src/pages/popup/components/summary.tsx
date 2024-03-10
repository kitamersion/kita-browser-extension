import { formatDuration } from "@/utils";
import { Text, Flex } from "@chakra-ui/react";
import React from "react";

type ISummary = {
  duration: number;
  total: number;
};

const Summary = ({ duration, total }: ISummary) => {
  return (
    <Flex flexDirection={"column"}>
      <Text>Total Items: {total}</Text>
      <Text>Total Duration: {formatDuration(duration)}</Text>
    </Flex>
  );
};

export default Summary;
