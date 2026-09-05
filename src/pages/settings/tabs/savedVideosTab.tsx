import LoadingState from "@/components/states/LoadingState";
import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import React, { Suspense } from "react";
import SavedVideosList from "../components/savedVideosList";

const SavedVideosTab = () => {
  return (
    <Box>
      <Suspense fallback={<LoadingState />}>
        <VStack spacing={4} align="stretch" mb={4}>
          <Heading size="lg" color="accent.primary">
            Saved Videos
          </Heading>
          <Text color="text.secondary" fontSize="sm">
            Browse, edit, and delete the videos saved to your library.
          </Text>
        </VStack>
        <SavedVideosList />
      </Suspense>
    </Box>
  );
};

export default SavedVideosTab;
