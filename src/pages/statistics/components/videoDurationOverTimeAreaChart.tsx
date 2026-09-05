import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { groupBy, map, sumBy, sortBy } from "lodash";
import { useVideoContext } from "@/context/videoContext";
import React, { useState, useEffect, useMemo } from "react";
import { Box, Heading } from "@chakra-ui/react";
import LoadingState from "@/components/states/LoadingState";
import ChartTooltipCard from "./chartTooltipCard";
import { useChartColors } from "./chartTheme";

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const days = (Number(payload[0].value) / 24).toFixed(2);
    return <ChartTooltipCard lines={[`Days: ${days}`]} />;
  }

  return null;
};

const VideoDurationOverTimeAreaChart = () => {
  const { isInitialized, totalVideos } = useVideoContext();
  const { primary, secondary, grid } = useChartColors();
  const [data, setData] = useState<{ date: string; duration: number }[]>([]);

  useEffect(() => {
    if (isInitialized && totalVideos) {
      // group videos by creation date and calculate total duration for each day
      const videosByDay = groupBy(totalVideos, (video) => new Date(video.created_at).toISOString().split("T")[0]);
      const dailyDurations = map(videosByDay, (videos, date) => ({
        date,
        duration: sumBy(videos, "video_duration") / 3600, // Convert seconds to hours
      }));

      // sort by date and calculate cumulative duration
      const sortedDurations = sortBy(dailyDurations, "date");
      let cumulativeDuration = 0;
      const newData = sortedDurations.map(({ date, duration }) => {
        cumulativeDuration += duration;
        return { date, duration: cumulativeDuration };
      });

      setData(newData);
    }
  }, [isInitialized, totalVideos]);

  const { firstDate, lastDate } = useMemo(() => {
    const firstDate = data[0]?.date;
    const today = new Date().toISOString().split("T")[0]; // current date
    const lastDate = data[data.length - 1]?.date === today ? today : data[data.length - 1]?.date;

    return { firstDate, lastDate };
  }, [data]);

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
        Cumulative Watch Time
      </Heading>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="watchTimeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primary} stopOpacity={0.5} />
              <stop offset="95%" stopColor={primary} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="date" ticks={[firstDate, lastDate]} stroke={grid} tick={{ fill: secondary, fontSize: 12 }} />
          <YAxis tickFormatter={(value) => (value / 24).toFixed(1) + " days"} stroke={grid} tick={{ fill: secondary, fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: grid }} />
          <Area dataKey="duration" stroke={primary} strokeWidth={2} fill="url(#watchTimeFill)" name="Day" />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default VideoDurationOverTimeAreaChart;
