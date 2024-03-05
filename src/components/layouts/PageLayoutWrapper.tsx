import React from "react";
import { Box, useColorMode } from "@chakra-ui/react";
import useScreenSize from "@/hooks/useScreenSize";

const MIN_SIZE_PX = "412px";

interface PageLayoutWrapperProps {
  children: React.ReactNode;
}

const PageLayoutWrapper: React.FC<PageLayoutWrapperProps> = ({ children }) => {
  const { colorMode } = useColorMode();
  const { isMobile } = useScreenSize();
  const bgColor = colorMode === "light" ? "white" : "gray.800";

  return (
    <Box m={0} p={0} bg={bgColor} minWidth={isMobile ? MIN_SIZE_PX : "full"}>
      {children}
    </Box>
  );
};

export default PageLayoutWrapper;
