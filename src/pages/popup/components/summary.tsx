import SummaryItem from "@/components/summaryItem";
import { useVideoContext } from "@/context/videoContext";
import { formatDuration } from "@/utils";
import { VStack, SimpleGrid, Box } from "@chakra-ui/react";
import React from "react";

const Summary = () => {
  const { totalDuration, totalDurationDay, totalVideoCount } = useVideoContext();

  return (
    <VStack spacing={3} mt={4} mx={2}>
      {/* First row - Videos and Today */}
      <SimpleGrid columns={2} spacing={3} w="full">
        <SummaryItem.Compact value={totalVideoCount} title="Videos" />
        <SummaryItem.Compact value={formatDuration(totalDurationDay)} title="Today" />
      </SimpleGrid>

      {/* Second row - All Time centered (triangle layout) */}
      <Box w="full" display="flex" justifyContent="center">
        <Box w="50%">
          <SummaryItem.Compact value={formatDuration(totalDuration)} title="All Time" />
        </Box>
      </Box>
    </VStack>
  );
};

export default Summary;
