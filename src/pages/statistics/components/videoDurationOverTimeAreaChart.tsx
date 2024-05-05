import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { groupBy, map, sumBy, sortBy } from "lodash";
import LoadingState from "@/components/states/LoadingState";
import { useVideoContext } from "@/context/videoContext";
import React from "react";
import { Box } from "@chakra-ui/react";

const CustomTooltip = ({ active, payload }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    const days = (payload[0].value / 24).toFixed(2);
    return (
      <div className="custom-tooltip">
        <p className="intro">{`Days : ${days}`}</p>
      </div>
    );
  }

  return null;
};

const VideoDurationOverTimeAreaChart = () => {
  const { isInitialized, totalVideos } = useVideoContext();

  if (!isInitialized) {
    return <LoadingState />;
  }

  // group videos by creation date and calculate total duration for each day
  const videosByDay = groupBy(totalVideos, (video) => new Date(video.created_at).toISOString().split("T")[0]);
  const dailyDurations = map(videosByDay, (videos, date) => ({
    date,
    duration: sumBy(videos, "video_duration") / 3600, // Convert seconds to hours
  }));

  // sort by date and calculate cumulative duration
  const sortedDurations = sortBy(dailyDurations, "date");
  let cumulativeDuration = 0;
  const data = sortedDurations.map(({ date, duration }) => {
    cumulativeDuration += duration;
    return { date, duration: cumulativeDuration };
  });

  // get the first and last dates
  const firstDate = data[0].date;
  const today = new Date().toISOString().split("T")[0]; // current date
  const lastDate = data[data.length - 1].date === today ? today : data[data.length - 1].date;

  return (
    <Box width={"full"} height={"500px"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" ticks={[firstDate, lastDate]} />
          <YAxis tickFormatter={(value) => (value / 24).toFixed(1) + " days"} />
          <Tooltip content={<CustomTooltip />} />
          <Area dataKey="duration" stroke="#8884d8" fill="#8884d8" name="Day" />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default VideoDurationOverTimeAreaChart;
