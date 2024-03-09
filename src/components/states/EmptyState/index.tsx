import { Center, Heading } from "@chakra-ui/react";
import React from "react";

const EmptyState = () => {
  return (
    <Center my={10}>
      <Heading>No videos found.</Heading>
    </Center>
  );
};

export default EmptyState;
