import React from "react";
import { createRoot } from "react-dom/client";
import { ColorModeScript, ChakraProvider } from "@chakra-ui/react";
import theme from "@/config/theme";

import Navigation from "@/components/navigation";
import PageLayoutWrapper from "@/components/layouts/PageLayoutWrapper";
import GlobalLayoutWrapper from "@/components/layouts/GlobalLayoutWrapper";

const HomePage = React.lazy(() => import("@/pages/homePage"));

const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <GlobalLayoutWrapper>
        <Navigation />
        <PageLayoutWrapper>
          <HomePage />
        </PageLayoutWrapper>
      </GlobalLayoutWrapper>
    </ChakraProvider>
  );
};

const root = createRoot(document.getElementById("app") as HTMLElement);
root.render(<App />);
