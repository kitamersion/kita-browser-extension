import LoadingState from "@/components/states/LoadingState";
import { Box } from "@chakra-ui/react";
import React, { Suspense } from "react";
import SavedVideosList from "../components/savedVideosList";

const SavedVideosTab = () => {
  return (
    <Box>
      <Suspense fallback={<LoadingState />}>
        <SavedVideosList />
      </Suspense>
    </Box>
  );
};

export default SavedVideosTab;
