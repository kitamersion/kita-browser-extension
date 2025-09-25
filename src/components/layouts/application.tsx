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
import { VideoTagRelationshipProvider } from "@/context/videoTagRelationshipContext";
import { AnilistProvider } from "@/context/anilistContext";
import { GraphqlProvider } from "@/context/apolloContext";
import { AutoTagProvider } from "@/context/autoTagContext";
import { LoggerProvider } from "@/context/loggingContext";

const Application = ({ children }: PropsWithChildren<unknown>) => {
  return (
    <ChakraProvider theme={theme} colorModeManager={colorModeManager}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <LoggerProvider>
        <ToastProvider>
          <ApplicationProvider>
            <AnilistProvider>
              <GraphqlProvider>
                <VideoTagRelationshipProvider>
                  <VideoProvider>
                    <TagProvider>
                      <AutoTagProvider>
                        <GlobalLayoutWrapper>
                          <Navigation />
                          <PageLayoutWrapper>{children}</PageLayoutWrapper>
                        </GlobalLayoutWrapper>
                      </AutoTagProvider>
                    </TagProvider>
                  </VideoProvider>
                </VideoTagRelationshipProvider>
              </GraphqlProvider>
            </AnilistProvider>
          </ApplicationProvider>
        </ToastProvider>
      </LoggerProvider>
    </ChakraProvider>
  );
};

export default Application;
