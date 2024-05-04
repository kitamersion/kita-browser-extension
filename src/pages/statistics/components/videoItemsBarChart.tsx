import LoadingState from "@/components/states/LoadingState";
import { useVideoContext } from "@/context/videoContext";
import { IVideo } from "@/types/video";
import { Box } from "@chakra-ui/react";
import React from "react";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";

const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`Date : ${label}`}</p>
        <p className="intro">{`Count : ${payload[0].value}`}</p>
      </div>
    );
  }

  return null;
};

const VideoBarChart = () => {
  const { isInitialized, totalVideos } = useVideoContext();

  // transform data to count number of videos per day
  const videosPerDay = totalVideos.reduce((acc: any, video: IVideo) => {
    const date = new Date(video.created_at).toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + 1; // increment count for this date
    return acc;
  }, {});

  // convert to array of objects
  const data = Object.entries(videosPerDay).map(([date, count]) => ({ date, count }));

  if (!isInitialized) {
    return <LoadingState />;
  }

  return (
    <Box width={"full"} height={"500px"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" fill="#8884d8" />
          <Line type="monotone" dataKey="count" stroke="#ff7300" />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default VideoBarChart;
