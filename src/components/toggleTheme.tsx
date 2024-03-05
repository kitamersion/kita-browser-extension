import React, { useCallback, useMemo } from "react";
import { IconButton, useColorMode } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

const TOGGLE_SUFFIX = "Toggle";
const TOGGLE_PREFIX = "theme";
const ToggleTheme = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDarkMode = useMemo(() => colorMode === "dark", [colorMode]);
  const buttonTitle = useCallback((theme: string) => {
    return `${TOGGLE_SUFFIX} ${theme} ${TOGGLE_PREFIX}`;
  }, []);
  return (
    <IconButton
      aria-label="Toggle Theme"
      variant="ghost"
      rounded="full"
      title={isDarkMode ? buttonTitle("light") : buttonTitle("dark")}
      onClick={toggleColorMode}
      icon={isDarkMode ? <SunIcon /> : <MoonIcon />}
    />
  );
};

export default ToggleTheme;
