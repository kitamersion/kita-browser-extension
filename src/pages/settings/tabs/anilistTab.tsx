import { TabPanel } from "@chakra-ui/react";
import React from "react";
import AnilistProfile from "../components/anilist/anilistProfile";
import { useAnilistContext } from "@/context/anilistContext";
import LoadingState from "@/components/states/LoadingState";

const AnilistTab = () => {
  const { isInitialized } = useAnilistContext();

  if (!isInitialized) return <LoadingState />;

  return (
    <TabPanel bg="bg.primary" color="text.primary">
      <AnilistProfile />
    </TabPanel>
  );
};

export default AnilistTab;
