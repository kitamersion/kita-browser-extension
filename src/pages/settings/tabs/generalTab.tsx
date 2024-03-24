import LoadingState from "@/components/states/LoadingState";
import { Flex, TabPanel } from "@chakra-ui/react";
import React, { Suspense } from "react";
import Exporter from "../components/exporter";

const GeneralTab = () => {
  return (
    <TabPanel>
      <Suspense fallback={<LoadingState />}>
        <Flex flexDirection={"column"} gap={8} alignItems={"flex-start"}>
          <Exporter />
          <p>Import data Coming soon...</p>
        </Flex>
      </Suspense>
    </TabPanel>
  );
};

export default GeneralTab;
