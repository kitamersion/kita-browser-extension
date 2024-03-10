import React from "react";
import { createRoot } from "react-dom/client";
import { ColorModeScript, ChakraProvider, theme } from "@chakra-ui/react";
import GlobalLayoutWrapper from "@/components/layouts/GlobalLayoutWrapper";
import PageLayoutWrapper from "@/components/layouts/PageLayoutWrapper";
import Navigation from "@/components/navigation";
import { VideoProvider } from "@/context/videoContext";

const PopUp = React.lazy(() => import("@/pages/popup/popup"));

const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <VideoProvider>
        <GlobalLayoutWrapper>
          <Navigation />
          <PageLayoutWrapper>
            <PopUp />
          </PageLayoutWrapper>
        </GlobalLayoutWrapper>
      </VideoProvider>
    </ChakraProvider>
  );
};

const root = createRoot(document.getElementById("popup") as HTMLElement);
root.render(<App />);
