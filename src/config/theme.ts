import { kitaSchema } from "@/data/kitaschema";
import { createLocalStorageManager, extendTheme, type ThemeConfig } from "@chakra-ui/react";

export const enum ThemeScheme {
  DARK = "dark",
  LIGHT = "light",
  SYSTEM = "system",
}

const config: ThemeConfig = {
  initialColorMode: ThemeScheme.DARK,
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === "dark" ? "gray.800" : "white",
      },
    }),
  },
});

const colorModeManager = createLocalStorageManager(kitaSchema.ApplicationSettings.StorageKeys.ThemeKey);

export { theme, colorModeManager };
