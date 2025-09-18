import { Center, Spinner } from "@chakra-ui/react";
import React from "react";

const LoadingState = () => {
  return (
    <Center data-testid="loading-center">
      <Spinner thickness="3px" speed="0.65s" emptyColor="gray.600" color="tomato" size="lg" data-testid="loading-spinner" />
    </Center>
  );
};

export default LoadingState;
