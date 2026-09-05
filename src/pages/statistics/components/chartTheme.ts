import { useColorModeValue, useToken } from "@chakra-ui/react";

// useToken can only resolve raw theme.colors entries, not semantic tokens
// (those are resolved via CSS variables at render time), so the light/dark
// pairs below mirror the semanticTokens defined in src/config/theme.ts.
// Recharts primitives (Bar/Line/Area/CartesianGrid/axis) take literal SVG
// color strings, not Chakra style props, which is why these are resolved
// here rather than used as `color`/`bg` props directly.
export function useChartColors() {
  const primaryToken = useColorModeValue("red.500", "kita.primary");
  const secondaryToken = useColorModeValue("gray.600", "kita.text.secondary");
  const gridToken = useColorModeValue("gray.200", "kita.border.primary");

  const [primary, secondary, grid] = useToken("colors", [primaryToken, secondaryToken, gridToken]);

  return { primary, secondary, grid };
}
