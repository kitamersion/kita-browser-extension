import { Center, Grid, TabPanel, Text } from "@chakra-ui/react";
import React from "react";
import Anilist from "../integrations/anilist";
import useScreenSize from "@/hooks/useScreenSize";
import TheMoeWay from "../integrations/themoeway";

const IntegrationTab = () => {
  const { columns } = useScreenSize();

  return (
    <TabPanel>
      <Grid templateColumns={`repeat(${columns}, 1fr)`} gap={4} mt={4} mx={2}>
        <Anilist />
        <TheMoeWay />
      </Grid>
      <Center mt={6}>
        <Text fontSize={14} color={"tomato"}>
          Please note that Kitamersion is an independent entity and is not affiliated with any of the integrations displayed on this page.
        </Text>
      </Center>
    </TabPanel>
  );
};

export default IntegrationTab;
