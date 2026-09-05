import LoadingState from "@/components/states/LoadingState";
import { useVideoContext } from "@/context/videoContext";
import { IVideo } from "@/types/video";
import { Box, Heading } from "@chakra-ui/react";
import React, { useMemo } from "react";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import ChartTooltipCard from "./chartTooltipCard";
import { useChartColors } from "./chartTheme";

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return <ChartTooltipCard label={`Date: ${label}`} lines={[`Count: ${payload[0].value}`]} />;
  }

  return null;
};

const VideoBarChart = () => {
  const { isInitialized, totalVideos } = useVideoContext();
  const { primary, secondary, grid } = useChartColors();

  // transform data to count number of videos per day
  const videosPerDay = useMemo(() => {
    return totalVideos.reduce((acc: Record<string, number>, video: IVideo) => {
      const date = new Date(video.created_at).toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1; // increment count for this date
      return acc;
    }, {});
  }, [totalVideos]);

  // convert to array of objects and sort by date
  const data = useMemo(() => {
    return Object.entries(videosPerDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [videosPerDay]);

  if (!isInitialized) {
    return <LoadingState />;
  }

  return (
    <Box
      width={"full"}
      height={"500px"}
      bg="bg.secondary"
      border="1px solid"
      borderColor="border.primary"
      rounded={"2xl"}
      boxShadow={"dark-lg"}
      p={4}
      transition="all 0.2s"
      _hover={{ borderColor: "kita.border.accent" }}
    >
      <Heading size="sm" color="accent.primary" mb={2}>
        Videos Per Day
      </Heading>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="date" stroke={grid} tick={{ fill: secondary, fontSize: 12 }} />
          <YAxis stroke={grid} tick={{ fill: secondary, fontSize: 12 }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: grid, opacity: 0.3 }} />
          <Bar dataKey="count" fill={primary} radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="count" stroke={secondary} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default VideoBarChart;
