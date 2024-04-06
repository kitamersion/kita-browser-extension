import LoadingState from "@/components/states/LoadingState";
import { Flex, Heading, TabPanel } from "@chakra-ui/react";
import React, { Suspense } from "react";
import Exporter from "../components/exporter";
import Importer from "../components/importer";
import ManuallyCopySettingsAndData from "../components/manuallyCopySettingsAndData";

const GeneralTab = () => {
  return (
    <TabPanel>
      <Suspense fallback={<LoadingState />}>
        <Flex flexDirection={"column"} gap={8} alignItems={"flex-start"}>
          <Heading as={"h2"} size={"md"}>
            Import / Export
          </Heading>
          <Flex gap={2}>
            <Exporter />
            <Importer />
          </Flex>
          <ManuallyCopySettingsAndData />
        </Flex>
      </Suspense>
    </TabPanel>
  );
};

export default GeneralTab;
