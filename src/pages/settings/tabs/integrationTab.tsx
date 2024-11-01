import { Alert, AlertIcon, Center, Grid, TabPanel } from "@chakra-ui/react";
import React from "react";
import Anilist from "../integrations/anilist";
import useScreenSize from "@/hooks/useScreenSize";
import TheMoeWay from "../integrations/themoeway";
import MyAnimeList from "../integrations/myanimelist";

const IntegrationTab = () => {
  const { columns } = useScreenSize();

  const enableMal = false;
  const enableMoeWay = false;

  return (
    <TabPanel>
      <Grid templateColumns={`repeat(${columns - 1}, 1fr)`} gap={4} mt={4} mx={2}>
        <Anilist />
        {enableMal && <MyAnimeList />}
        {enableMoeWay && <TheMoeWay />}
      </Grid>
      <Center mt={6}>
        <Alert status="warning" rounded={"3xl"} fontSize={14} maxWidth={"70%"}>
          <AlertIcon />
          Please note that Kitamersion is an independent entity and is not affiliated with any of the integrations displayed on this page.
        </Alert>
      </Center>
    </TabPanel>
  );
};

export default IntegrationTab;
