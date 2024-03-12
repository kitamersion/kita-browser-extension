import { VideoProvider } from "@/context/videoContext";
import { ChakraProvider, theme, ColorModeScript } from "@chakra-ui/react";
import React, { PropsWithChildren } from "react";
import Navigation from "../navigation";
import GlobalLayoutWrapper from "./globalLayoutWrapper";
import PageLayoutWrapper from "./pageLayoutWrapper";

const Application = ({ children }: PropsWithChildren<unknown>) => {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <VideoProvider>
        <GlobalLayoutWrapper>
          <Navigation />
          <PageLayoutWrapper>{children}</PageLayoutWrapper>
        </GlobalLayoutWrapper>
      </VideoProvider>
    </ChakraProvider>
  );
};

export default Application;
