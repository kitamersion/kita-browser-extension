import { Grid, Heading, TabPanel, VStack, Text } from "@chakra-ui/react";
import React, { Suspense } from "react";
import LoadingState from "@/components/states/LoadingState";
import useScreenSize from "@/hooks/useScreenSize";
import TagGroup from "../components/tagGroup";
import AutoTagGroup from "../components/autoTagGroup";

const TagTab = () => {
  const { columns } = useScreenSize();

  return (
    <TabPanel bg="bg.primary" color="text.primary">
      <Suspense fallback={<LoadingState />}>
        <VStack spacing={4} align="stretch">
          <Heading size="lg" color="accent.primary">
            Tag Management
          </Heading>
          <Text color="text.secondary" fontSize="sm">
            Manage your tags and auto-tagging rules to organize your saved content.
          </Text>
        </VStack>
        <Grid templateColumns={`repeat(${columns}, 1fr)`} gap={4} mt={4} mx={2}>
          <TagGroup />
          <AutoTagGroup />
        </Grid>
      </Suspense>
    </TabPanel>
  );
};

export default TagTab;
