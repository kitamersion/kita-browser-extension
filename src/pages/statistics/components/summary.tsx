import SummaryItem from "@/components/summaryItem";
import { useVideoContext } from "@/context/videoContext";
import useScreenSize from "@/hooks/useScreenSize";
import { formatDuration } from "@/utils";
import { SimpleGrid, VStack } from "@chakra-ui/react";
import React, { useMemo } from "react";

const Summary = () => {
  const { isMobile, columns } = useScreenSize();
  const { totalDuration, totalDurationDay, totalDurationWeek, totalDurationMonth, totalDurationYear, totalVideoCount } = useVideoContext();

  const summaryColumns = useMemo(() => {
    return isMobile ? 2 : Math.min(columns + 1, 6);
  }, [columns, isMobile]);

  return (
    <VStack spacing={6} mt={6} mx={4}>
      {/* Main stats grid */}
      <SimpleGrid columns={summaryColumns} spacing={6} w="full">
        <SummaryItem variant="expanded">
          <SummaryItem.Value value={totalVideoCount} />
          <SummaryItem.Title>Total Videos</SummaryItem.Title>
        </SummaryItem>

        <SummaryItem variant="expanded">
          <SummaryItem.Value value={formatDuration(totalDurationDay)} />
          <SummaryItem.Title>Last 24h</SummaryItem.Title>
        </SummaryItem>

        <SummaryItem variant="expanded">
          <SummaryItem.Value value={formatDuration(totalDurationWeek)} />
          <SummaryItem.Title>This Week</SummaryItem.Title>
        </SummaryItem>

        <SummaryItem variant="expanded">
          <SummaryItem.Value value={formatDuration(totalDurationMonth)} />
          <SummaryItem.Title>This Month</SummaryItem.Title>
        </SummaryItem>

        <SummaryItem variant="expanded">
          <SummaryItem.Value value={formatDuration(totalDurationYear)} />
          <SummaryItem.Title>This Year</SummaryItem.Title>
        </SummaryItem>

        <SummaryItem variant="expanded">
          <SummaryItem.Value value={formatDuration(totalDuration)} />
          <SummaryItem.Title>All Time</SummaryItem.Title>
        </SummaryItem>
      </SimpleGrid>
    </VStack>
  );
};

export default Summary;
