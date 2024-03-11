import React from "react";
import { createRoot } from "react-dom/client";
import { ColorModeScript, ChakraProvider, theme } from "@chakra-ui/react";
import GlobalLayoutWrapper from "@/components/layouts/GlobalLayoutWrapper";
import PageLayoutWrapper from "@/components/layouts/PageLayoutWrapper";
import Navigation from "@/components/navigation";
import { VideoProvider } from "@/context/videoContext";

const Settings = React.lazy(() => import("@/pages/settings/settings"));

const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <VideoProvider>
        <GlobalLayoutWrapper>
          <Navigation />
          <PageLayoutWrapper>
            <Settings />
          </PageLayoutWrapper>
        </GlobalLayoutWrapper>
      </VideoProvider>
    </ChakraProvider>
  );
};

const root = createRoot(document.getElementById("settings") as HTMLElement);
root.render(<App />);
