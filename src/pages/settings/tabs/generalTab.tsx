import LoadingState from "@/components/states/LoadingState";
import { Box, Flex, Heading, VStack, Text } from "@chakra-ui/react";
import React, { Suspense } from "react";
import Exporter from "../components/exporter";
import ManuallyCopySettingsAndData from "../components/manuallyCopySettingsAndData";
import Importer from "../components/importer";

const GeneralTab = () => {
  return (
    <Box>
      <Suspense fallback={<LoadingState />}>
        <Flex flexDirection={"column"} gap={8} alignItems={"flex-start"}>
          <VStack spacing={4} align="stretch">
            <Heading size="lg" color="accent.primary">
              Import and Export Data
            </Heading>
            <Text color="text.secondary" fontSize="sm">
              You can export your settings and data to a JSON file for backup or transfer to another device. You can also import settings
              and data from a previously exported JSON file. Note that importing will overwrite your current settings and data.
            </Text>
          </VStack>
          <Flex gap={2}>
            <Exporter />
            <Importer />
          </Flex>
          <ManuallyCopySettingsAndData />
        </Flex>
      </Suspense>
    </Box>
  );
};

export default GeneralTab;
