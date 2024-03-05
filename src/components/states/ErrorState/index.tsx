import { Center, Heading } from "@chakra-ui/react";
import React from "react";

type IErrorState = {
  message?: string;
};

const ErrorState = ({ message }: IErrorState) => {
  return (
    <Center my={10}>
      <Heading>{message || "Something went wrong"}</Heading>
    </Center>
  );
};

export default ErrorState;
