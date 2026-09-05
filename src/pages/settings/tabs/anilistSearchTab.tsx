import { Box } from "@chakra-ui/react";
import React from "react";
import AnilistSearch from "../components/anilist/anilistSearch";
import { useAnilistContext } from "@/context/anilistContext";
import LoadingState from "@/components/states/LoadingState";

const AnilistSearchTab = () => {
  const { isInitialized } = useAnilistContext();

  if (!isInitialized) return <LoadingState />;

  return (
    <Box>
      <AnilistSearch />
    </Box>
  );
};

export default AnilistSearchTab;
