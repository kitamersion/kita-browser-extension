import { Box, Flex, Grid, HStack, Heading, Text, Tooltip } from "@chakra-ui/react";
import React, { useMemo } from "react";
import { useVideoContext } from "@/context/videoContext";
import { buildActivityStreak } from "./activityStreakUtils";

const LEVEL_COLORS = ["bg.tertiary", "kita.primaryAlpha.300", "kita.primaryAlpha.500", "kita.primaryAlpha.700", "kita.primaryAlpha.900"];
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const WEEK_COUNT = 52;
const ROW_HEIGHT = "14px";
const GRID_GAP = "3px";
const WEEKDAY_COLUMN_WIDTH = "24px";
const GRID_ROWS_HEIGHT = `calc(${ROW_HEIGHT} * 7 + ${GRID_GAP} * 6)`;

const ActivityStreak = () => {
  const { totalVideos } = useVideoContext();
  const { weeks, monthLabels, totalInRange } = useMemo(() => buildActivityStreak(totalVideos, new Date(), WEEK_COUNT), [totalVideos]);

  return (
    <Box
      bg="bg.secondary"
      border="1px solid"
      borderColor="border.primary"
      rounded="2xl"
      boxShadow="dark-lg"
      p={4}
      transition="all 0.2s"
      _hover={{ borderColor: "kita.border.accent" }}
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="sm" color="accent.primary">
          Activity — Last 12 Months
        </Heading>
        <Text fontSize="xs" color="text.tertiary">
          {totalInRange} video{totalInRange === 1 ? "" : "s"}
        </Text>
      </Flex>

      <Flex>
        <Grid templateRows={`repeat(7, ${ROW_HEIGHT})`} gap={GRID_GAP} mr={2} mt="18px" width={WEEKDAY_COLUMN_WIDTH} flexShrink={0}>
          {WEEKDAY_LABELS.map((label, index) => (
            <Text key={index} fontSize="10px" lineHeight={ROW_HEIGHT} color="text.tertiary">
              {label}
            </Text>
          ))}
        </Grid>

        <Box flex="1" minW={0}>
          <Grid templateColumns={`repeat(${weeks.length}, 1fr)`} gap={GRID_GAP} mb={1} height="14px">
            {weeks.map((_, weekIndex) => (
              <Box key={weekIndex} fontSize="10px" color="text.tertiary" overflow="hidden" whiteSpace="nowrap">
                {monthLabels.find((month) => month.weekIndex === weekIndex)?.label ?? ""}
              </Box>
            ))}
          </Grid>

          <Grid
            templateColumns={`repeat(${weeks.length}, 1fr)`}
            templateRows={`repeat(7, ${ROW_HEIGHT})`}
            gap={GRID_GAP}
            gridAutoFlow="column"
            height={GRID_ROWS_HEIGHT}
          >
            {weeks.flatMap((week) =>
              week.map((day) =>
                day.isFuture ? (
                  <Box key={day.date} data-testid="activity-streak-day" />
                ) : (
                  <Tooltip key={day.date} label={`${day.count} video${day.count === 1 ? "" : "s"} on ${day.date}`} hasArrow openDelay={100}>
                    <Box borderRadius="2px" bg={LEVEL_COLORS[day.level]} data-testid="activity-streak-day" data-date={day.date} />
                  </Tooltip>
                )
              )
            )}
          </Grid>
        </Box>
      </Flex>

      <HStack spacing={1} mt={3} justify="flex-end" fontSize="10px" color="text.tertiary">
        <Text>Less</Text>
        {LEVEL_COLORS.map((color) => (
          <Box key={color} width="10px" height="10px" borderRadius="2px" bg={color} />
        ))}
        <Text>More</Text>
      </HStack>
    </Box>
  );
};

export default ActivityStreak;
