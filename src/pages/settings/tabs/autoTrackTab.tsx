import { Box, Grid, Heading, TabPanel, Text, VStack } from "@chakra-ui/react";
import React from "react";
import Crunchyroll from "../integrations/crunchyroll";
import Youtube from "../integrations/youtube";
import PendingAnilistReview from "./components/pendingAnilistReview";
import useScreenSize from "@/hooks/useScreenSize";

const AutoTrackTab = () => {
  const { columns } = useScreenSize();

  return (
    <TabPanel bg="bg.primary" color="text.primary">
      <VStack spacing={4} align="stretch">
        <Heading size="lg" color="accent.primary">
          Auto Track
        </Heading>
        <Text color="text.secondary" fontSize="sm">
          Automatically track videos in Kita as you watch, and optionally sync them to connected integrations once a threshold is reached.
        </Text>
      </VStack>

      <Box mt={4} mx={2}>
        <PendingAnilistReview />
      </Box>

      <Grid templateColumns={`repeat(${columns - 1}, 1fr)`} gap={4} mt={4} mx={2}>
        <Crunchyroll />
        <Youtube />
      </Grid>
    </TabPanel>
  );
};

export default AutoTrackTab;
