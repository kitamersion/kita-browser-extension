import { Center, Flex, Grid, TabPanel, Text } from "@chakra-ui/react";
import React, { Suspense } from "react";
import LoadingState from "@/components/states/LoadingState";
import Anilist from "../integrations/anilist";
import useScreenSize from "@/hooks/useScreenSize";

const IntegrationTab = () => {
  const { columns } = useScreenSize();

  return (
    <TabPanel>
      <Suspense fallback={<LoadingState />}>
        <Grid templateColumns={`repeat(${columns}, 1fr)`} gap={4} mt={4} mx={2}>
          <Anilist />
        </Grid>
        <Center mt={6}>
          <Text fontSize={14} color={"tomato"}>
            Please note that Kitamersion is an independent entity and is not affiliated with any of the integrations displayed on this page.
          </Text>
        </Center>
      </Suspense>
    </TabPanel>
  );
};

export default IntegrationTab;
