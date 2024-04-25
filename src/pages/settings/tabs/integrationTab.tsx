import { Grid, TabPanel } from "@chakra-ui/react";
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
      </Suspense>
    </TabPanel>
  );
};

export default IntegrationTab;
