import LoadingState from "@/components/states/LoadingState";
import { useTagContext } from "@/context/tagContext";
import { useVideoContext } from "@/context/videoContext";
import { Box } from "@chakra-ui/react";
import React, { useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

const TagAssignedRadar = () => {
  const { isInitialized: videoContextInitialized, totalVideos } = useVideoContext();
  const { isInitialized: tagContextInitialized, tags } = useTagContext();

  // Calculate the number of videos for each tag
  const data = useMemo(
    () =>
      tags.map((tag) => ({
        tagName: tag.name,
        count: tag.id ? totalVideos.filter((video) => video.tags?.includes(tag.id as string)).length : 0,
      })),
    [tags, totalVideos]
  );

  if (!videoContextInitialized && !tagContextInitialized) {
    return <LoadingState />;
  }

  return (
    <Box width={"full"} height={"500px"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="90%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="tagName" />
          <PolarRadiusAxis />
          <Radar name="Assigned Items" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default TagAssignedRadar;
