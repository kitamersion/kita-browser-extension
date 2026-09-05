import SummaryItem from "@/components/summaryItem";
import { useVideoContext } from "@/context/videoContext";
import { formatDuration, formatDurationHuman } from "@/utils";
import { VStack, SimpleGrid, Box } from "@chakra-ui/react";
import React from "react";
import { MdAccessTime, MdAllInclusive, MdVideoLibrary } from "react-icons/md";

const Summary = () => {
  const { totalDuration, totalDurationDay, totalVideoCount } = useVideoContext();

  return (
    <VStack spacing={3} mt={4} mx={2}>
      {/* First row - Videos and Today */}
      <SimpleGrid columns={2} spacing={3} w="full">
        <SummaryItem.Compact value={totalVideoCount} title="Videos" icon={MdVideoLibrary} />
        <SummaryItem.Compact value={formatDuration(totalDurationDay)} title="Today" icon={MdAccessTime} />
      </SimpleGrid>

      {/* Second row - All Time centered (triangle layout) */}
      <Box w="full" display="flex" justifyContent="center">
        <Box w="50%">
          <SummaryItem.Compact value={formatDurationHuman(totalDuration)} title="All Time" icon={MdAllInclusive} highlight />
        </Box>
      </Box>
    </VStack>
  );
};

export default Summary;
