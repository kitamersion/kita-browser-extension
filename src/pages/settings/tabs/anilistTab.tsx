import { Box } from "@chakra-ui/react";
import React from "react";
import AnilistProfile from "../components/anilist/anilistProfile";
import { useAnilistContext } from "@/context/anilistContext";
import LoadingState from "@/components/states/LoadingState";

const AnilistTab = () => {
  const { isInitialized } = useAnilistContext();

  if (!isInitialized) return <LoadingState />;

  return (
    <Box>
      <AnilistProfile />
    </Box>
  );
};

export default AnilistTab;
