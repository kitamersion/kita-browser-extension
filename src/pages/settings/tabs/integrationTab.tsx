import { Alert, AlertIcon, Center, Grid, Heading, TabPanel, Text, VStack } from "@chakra-ui/react";
import React from "react";
import Anilist from "../integrations/anilist";
import useScreenSize from "@/hooks/useScreenSize";

const IntegrationTab = () => {
  const { columns } = useScreenSize();

  return (
    <TabPanel bg="bg.primary" color="text.primary">
      <VStack spacing={4} align="stretch">
        <Heading size="lg" color="accent.primary">
          Integrations
        </Heading>
        <Text color="text.secondary" fontSize="sm">
          Manage third-party integrations to sync your data across platforms.
        </Text>

        <Center>
          <Alert status="warning" rounded={"3xl"} fontSize={14} maxWidth={"70%"} variant="kita">
            <AlertIcon color="orange.400" />
            Please note that Kitamersion is an independent entity and is not affiliated with any of the integrations displayed on this page.
          </Alert>
        </Center>
      </VStack>

      <Grid templateColumns={`repeat(${columns - 1}, 1fr)`} gap={4} mt={4} mx={2}>
        <Anilist />
      </Grid>
    </TabPanel>
  );
};

export default IntegrationTab;
