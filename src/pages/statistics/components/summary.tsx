import SummaryItem from "@/components/summaryItem";
import { useVideoContext } from "@/context/videoContext";
import useScreenSize from "@/hooks/useScreenSize";
import { formatDuration } from "@/utils";
import { Box, GridItem, SimpleGrid, VStack } from "@chakra-ui/react";
import React, { useMemo } from "react";
import { MdAccessTime, MdAllInclusive, MdCalendarMonth, MdCalendarToday, MdVideoLibrary, MdViewWeek } from "react-icons/md";

const Summary = () => {
  const { isMobile, columns } = useScreenSize();
  const { totalDuration, totalDurationDay, totalDurationWeek, totalDurationMonth, totalDurationYear, totalVideoCount } = useVideoContext();

  const summaryColumns = useMemo(() => {
    return isMobile ? 2 : Math.min(columns + 1, 6);
  }, [columns, isMobile]);

  return (
    <VStack spacing={6} mt={6} mx={4}>
      <Box bg="bg.secondary" border="1px solid" borderColor="border.primary" borderRadius="2xl" p={6} w="full">
        <SimpleGrid columns={summaryColumns} spacing={6} w="full">
          <SummaryItem variant="expanded" icon={MdVideoLibrary}>
            <SummaryItem.Value value={totalVideoCount} />
            <SummaryItem.Title>Total Videos</SummaryItem.Title>
          </SummaryItem>

          <SummaryItem variant="expanded" icon={MdAccessTime}>
            <SummaryItem.Value value={formatDuration(totalDurationDay)} />
            <SummaryItem.Title>Last 24h</SummaryItem.Title>
          </SummaryItem>

          <SummaryItem variant="expanded" icon={MdViewWeek}>
            <SummaryItem.Value value={formatDuration(totalDurationWeek)} />
            <SummaryItem.Title>This Week</SummaryItem.Title>
          </SummaryItem>

          <SummaryItem variant="expanded" icon={MdCalendarMonth}>
            <SummaryItem.Value value={formatDuration(totalDurationMonth)} />
            <SummaryItem.Title>This Month</SummaryItem.Title>
          </SummaryItem>

          <SummaryItem variant="expanded" icon={MdCalendarToday}>
            <SummaryItem.Value value={formatDuration(totalDurationYear)} />
            <SummaryItem.Title>This Year</SummaryItem.Title>
          </SummaryItem>

          <GridItem colSpan={2}>
            <SummaryItem variant="expanded" icon={MdAllInclusive} highlight>
              <SummaryItem.Value value={formatDuration(totalDuration)} />
              <SummaryItem.Title>All Time</SummaryItem.Title>
            </SummaryItem>
          </GridItem>
        </SimpleGrid>
      </Box>
    </VStack>
  );
};

export default Summary;
