import { Grid, TabPanel } from "@chakra-ui/react";
import React, { Suspense } from "react";
import LoadingState from "@/components/states/LoadingState";
import useScreenSize from "@/hooks/useScreenSize";
import TagGroup from "../components/tagGroup";
import AutoTagGroup from "../components/autoTagGroup";

const TagTab = () => {
  const { columns } = useScreenSize();

  return (
    <TabPanel>
      <Suspense fallback={<LoadingState />}>
        <Grid templateColumns={`repeat(${columns - 1}, 1fr)`} gap={4} mt={4} mx={2}>
          <TagGroup />
          <AutoTagGroup />
        </Grid>
      </Suspense>
    </TabPanel>
  );
};

export default TagTab;
