import { TabPanel } from "@chakra-ui/react";
import React from "react";
import AnilistProfile from "../components/anilist/anilistProfile";
import { useGetMeQuery } from "@/graphql";
import { useAnilistContext } from "@/context/anilistContext";
import LoadingState from "@/components/states/LoadingState";

const AnilistTab = () => {
  const { anilistAuthStatus } = useAnilistContext();
  const { data, loading } = useGetMeQuery({
    skip: anilistAuthStatus !== "authorized",
  });

  if (loading) return <LoadingState />;

  return (
    <TabPanel bg="bg.primary" color="text.primary">
      <AnilistProfile Viewer={data?.Viewer} />
    </TabPanel>
  );
};

export default AnilistTab;
