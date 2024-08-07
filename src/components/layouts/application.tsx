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
import { CachedMediaProvider } from "@/context/cachedMediaContext";
import { MyAnimeListProvider } from "@/context/myanimelistContext";

const Application = ({ children }: PropsWithChildren<unknown>) => {
  return (
    <ChakraProvider theme={theme} colorModeManager={colorModeManager}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ToastProvider>
        <ApplicationProvider>
          <CachedMediaProvider>
            <AnilistProvider>
              <GraphqlProvider>
                <MyAnimeListProvider>
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
                </MyAnimeListProvider>
              </GraphqlProvider>
            </AnilistProvider>
          </CachedMediaProvider>
        </ApplicationProvider>
      </ToastProvider>
    </ChakraProvider>
  );
};

export default Application;
