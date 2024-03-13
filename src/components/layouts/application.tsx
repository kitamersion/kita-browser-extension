import { ChakraProvider, theme, ColorModeScript } from "@chakra-ui/react";
import React, { PropsWithChildren } from "react";
import Navigation from "../navigation";
import GlobalLayoutWrapper from "./globalLayoutWrapper";
import PageLayoutWrapper from "./pageLayoutWrapper";
import { VideoProvider } from "@/context/videoContext";
import { TagProvider } from "@/context/tagContext";

const Application = ({ children }: PropsWithChildren<unknown>) => {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <VideoProvider>
        <TagProvider>
          <GlobalLayoutWrapper>
            <Navigation />
            <PageLayoutWrapper>{children}</PageLayoutWrapper>
          </GlobalLayoutWrapper>
        </TagProvider>
      </VideoProvider>
    </ChakraProvider>
  );
};

export default Application;
