import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import React, { PropsWithChildren } from "react";
import Navigation from "../navigation";
import GlobalLayoutWrapper from "./globalLayoutWrapper";
import PageLayoutWrapper from "./pageLayoutWrapper";
import { VideoProvider } from "@/context/videoContext";
import { TagProvider } from "@/context/tagContext";
import { ApplicationProvider } from "@/context/applicationContext";
import { theme, colorModeManager } from "@/config/theme";
import { ToastProvider } from "@/context/toastNotificationContext";

const Application = ({ children }: PropsWithChildren<unknown>) => {
  return (
    <ChakraProvider theme={theme} colorModeManager={colorModeManager}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ToastProvider>
        <ApplicationProvider>
          <VideoProvider>
            <TagProvider>
              <GlobalLayoutWrapper>
                <Navigation />
                <PageLayoutWrapper>{children}</PageLayoutWrapper>
              </GlobalLayoutWrapper>
            </TagProvider>
          </VideoProvider>
        </ApplicationProvider>
      </ToastProvider>
    </ChakraProvider>
  );
};

export default Application;
