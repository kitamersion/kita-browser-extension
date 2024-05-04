import { useVideoContext } from "@/context/videoContext";
import useScreenSize from "@/hooks/useScreenSize";
import { formatDuration } from "@/utils";
import { Flex, Grid, Text } from "@chakra-ui/react";
import React, { PropsWithChildren, useMemo } from "react";

const SummaryItem = ({ children }: PropsWithChildren<any>) => {
  return (
    <Flex flexDirection={"column"} rounded={"2xl"} p={4} alignItems={"center"} boxShadow={"dark-lg"}>
      {children}
    </Flex>
  );
};

SummaryItem.Value = function SummaryItemValue({ value }: { value: string | number }) {
  return <Text as={"b"}>{value}</Text>;
};

SummaryItem.Title = function SummaryItemTitle({ children }: PropsWithChildren<any>) {
  return (
    <Text fontSize={12} color={"tomato"}>
      {children}
    </Text>
  );
};

const Summary = () => {
  const { isMobile, columns } = useScreenSize();
  const { totalDuration, totalDurationDay, totalDurationWeek, totalDurationMonth, totalDurationYear, totalVideoCount } = useVideoContext();

  const summaryColumns = useMemo(() => {
    return isMobile ? columns + 1 : columns + 3;
  }, [columns, isMobile]);

  return (
    <Grid templateColumns={`repeat(${summaryColumns}, 1fr)`} gap={2} mt={4} mx={2}>
      <SummaryItem>
        <SummaryItem.Value value={totalVideoCount} />
        <SummaryItem.Title>Total Videos</SummaryItem.Title>
      </SummaryItem>

      <SummaryItem>
        <SummaryItem.Value value={formatDuration(totalDurationDay)} />
        <SummaryItem.Title>24h</SummaryItem.Title>
      </SummaryItem>

      <SummaryItem>
        <SummaryItem.Value value={formatDuration(totalDurationWeek)} />
        <SummaryItem.Title>Week</SummaryItem.Title>
      </SummaryItem>

      <SummaryItem>
        <SummaryItem.Value value={formatDuration(totalDurationMonth)} />
        <SummaryItem.Title>Month</SummaryItem.Title>
      </SummaryItem>

      <SummaryItem>
        <SummaryItem.Value value={formatDuration(totalDurationYear)} />
        <SummaryItem.Title>Year</SummaryItem.Title>
      </SummaryItem>

      <SummaryItem>
        <SummaryItem.Value value={formatDuration(totalDuration)} />
        <SummaryItem.Title>Overall</SummaryItem.Title>
      </SummaryItem>
    </Grid>
  );
};

export default Summary;
