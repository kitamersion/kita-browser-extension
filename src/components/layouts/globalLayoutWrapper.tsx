import React from "react";
import { Box } from "@chakra-ui/react";
import useScreenSize from "@/hooks/useScreenSize";

interface GlobalLayoutWrapperProps {
  children: React.ReactNode;
}

const GlobalLayoutWrapper: React.FC<GlobalLayoutWrapperProps> = ({ children }) => {
  const { isMobile } = useScreenSize();

  return (
    <Box bg="bg.primary" color="text.primary" minWidth={isMobile ? "auto" : "full"}>
      {children}
    </Box>
  );
};

export default GlobalLayoutWrapper;
