import { Center, Spinner } from "@chakra-ui/react";
import React from "react";

const LoadingState = () => {
  return (
    <Center data-testid="loading-center">
      <Spinner thickness="4px" speed="0.65s" emptyColor="gray.200" color="red.600" size="lg" data-testid="loading-spinner" />
    </Center>
  );
};

export default LoadingState;
