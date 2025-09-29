import React from "react";
import { Box } from "@chakra-ui/react";
import useScreenSize from "@/hooks/useScreenSize";

const MIN_SIZE_PX = "412px";

interface PageLayoutWrapperProps {
  children: React.ReactNode;
}

const PageLayoutWrapper: React.FC<PageLayoutWrapperProps> = ({ children }) => {
  const { isMobile } = useScreenSize();

  return (
    <Box width={"full"} px={2} bg="bg.primary" color="text.primary" minWidth={isMobile ? MIN_SIZE_PX : "full"}>
      {children}
    </Box>
  );
};

export default PageLayoutWrapper;
