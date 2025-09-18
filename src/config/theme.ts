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

// Custom color palette inspired by your video cards and series mapping
const colors = {
  kita: {
    // Primary brand colors
    primary: "#FF6347", // tomato
    primaryAlpha: {
      50: "rgba(255, 99, 71, 0.04)",
      100: "rgba(255, 99, 71, 0.06)",
      200: "rgba(255, 99, 71, 0.08)",
      300: "rgba(255, 99, 71, 0.16)",
      400: "rgba(255, 99, 71, 0.24)",
      500: "rgba(255, 99, 71, 0.36)",
      600: "rgba(255, 99, 71, 0.48)",
      700: "rgba(255, 99, 71, 0.64)",
      800: "rgba(255, 99, 71, 0.80)",
      900: "rgba(255, 99, 71, 0.92)",
    },
    // Dark theme backgrounds
    bg: {
      primary: "rgba(0, 0, 0, 0.95)", // Main dark bg
      secondary: "rgba(255, 255, 255, 0.05)", // Card backgrounds
      tertiary: "rgba(255, 255, 255, 0.02)", // Subtle backgrounds
      overlay: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)",
    },
    // Border colors
    border: {
      primary: "rgba(255, 255, 255, 0.1)",
      secondary: "rgba(255, 255, 255, 0.05)",
      accent: "rgba(255, 99, 71, 0.3)",
    },
    // Text colors
    text: {
      primary: "#FFFFFF",
      secondary: "#A0AEC0", // gray.400
      tertiary: "#718096", // gray.500
      muted: "#4A5568", // gray.600
    },
    // Success color (for synced states)
    success: "rgba(72, 187, 120, 0.8)", // green with opacity
  },
};

const theme = extendTheme({
  config,
  colors,
  semanticTokens: {
    colors: {
      // Background tokens
      "bg.primary": {
        default: "white",
        _dark: "kita.bg.primary",
      },
      "bg.secondary": {
        default: "gray.50",
        _dark: "kita.bg.secondary",
      },
      "bg.tertiary": {
        default: "gray.100",
        _dark: "kita.bg.tertiary",
      },
      // Text tokens
      "text.primary": {
        default: "gray.800",
        _dark: "kita.text.primary",
      },
      "text.secondary": {
        default: "gray.600",
        _dark: "kita.text.secondary",
      },
      "text.tertiary": {
        default: "gray.500",
        _dark: "kita.text.tertiary",
      },
      // Border tokens
      "border.primary": {
        default: "gray.200",
        _dark: "kita.border.primary",
      },
      "border.secondary": {
        default: "gray.100",
        _dark: "kita.border.secondary",
      },
      // Accent color
      "accent.primary": {
        default: "red.500",
        _dark: "kita.primary",
      },
    },
  },
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === "dark" ? "kita.bg.primary" : "white",
        color: props.colorMode === "dark" ? "kita.text.primary" : "gray.800",
      },
    }),
  },
  components: {
    // Drawer component overrides
    Drawer: {
      variants: {
        kita: {
          dialog: {
            bg: "bg.primary",
            color: "text.primary",
          },
          closeButton: {
            color: "text.primary",
            _hover: {
              bg: "kita.primaryAlpha.200",
            },
          },
          header: {
            color: "accent.primary",
          },
        },
      },
    },
    // Alert component overrides
    Alert: {
      variants: {
        kita: {
          container: {
            bg: "kita.primaryAlpha.100",
            border: "1px solid",
            borderColor: "kita.border.accent",
            color: "text.primary",
          },
        },
      },
    },
    // Box/Card component overrides
    Box: {
      variants: {
        card: {
          bg: "bg.secondary",
          border: "1px solid",
          borderColor: "border.primary",
          rounded: "lg",
          transition: "all 0.2s",
          _hover: {
            borderColor: "kita.border.accent",
            boxShadow: "lg",
          },
        },
        "video-card": {
          bg: "transparent",
          border: "none",
          rounded: "2xl",
          overflow: "hidden",
          position: "relative",
          minH: "200px",
          boxShadow: "dark-lg",
        },
        "settings-card": {
          bg: "bg.secondary",
          border: "1px solid",
          borderColor: "border.primary",
          rounded: "xl",
          p: 6,
          transition: "all 0.2s",
          _hover: {
            bg: "kita.primaryAlpha.100",
            borderColor: "kita.border.accent",
            boxShadow: "xl",
          },
        },
      },
    },
    // Button component overrides
    Button: {
      variants: {
        kita: {
          bg: "kita.primaryAlpha.800",
          color: "white",
          border: "2px solid",
          borderColor: "kita.primary",
          _hover: {
            bg: "kita.primary",
            transform: "scale(1.05)",
          },
          _active: {
            bg: "kita.primary",
          },
        },
        "kita-outline": {
          bg: "transparent",
          color: "accent.primary",
          border: "1px solid",
          borderColor: "kita.primaryAlpha.500",
          _hover: {
            bg: "kita.primaryAlpha.100",
            borderColor: "accent.primary",
          },
        },
      },
    },
    // Badge component overrides
    Badge: {
      variants: {
        kita: {
          bg: "kita.primaryAlpha.800",
          color: "white",
          rounded: "full",
          px: 3,
          py: 1,
        },
        "kita-success": {
          bg: "kita.success",
          color: "white",
          rounded: "full",
          px: 3,
          py: 1,
        },
      },
    },
    // Tag component overrides
    Tag: {
      variants: {
        kita: {
          bg: "kita.primaryAlpha.600", // More opaque for visibility on background images
          color: "white",
          border: "1px solid",
          borderColor: "kita.primaryAlpha.700",
          fontSize: "xs",
          fontWeight: "medium",
          px: 2,
          py: 1,
          _hover: {
            bg: "kita.primaryAlpha.700",
            borderColor: "accent.primary",
          },
        },
        "kita-subtle": {
          bg: "kita.primaryAlpha.400", // Semi-transparent tomato background
          color: "white",
          border: "1px solid",
          borderColor: "kita.primaryAlpha.500",
          fontSize: "xs",
          fontWeight: "medium",
          px: 2,
          py: 1,
          _hover: {
            bg: "kita.primaryAlpha.500",
            borderColor: "accent.primary",
          },
        },
      },
    },
    // Skeleton overrides for dark theme
    Skeleton: {
      defaultProps: {
        startColor: "gray.700",
        endColor: "gray.600",
      },
    },
  },
});

const colorModeManager = createLocalStorageManager(kitaSchema.ApplicationSettings.StorageKeys.ThemeKey);

export { theme, colorModeManager };
