import { Box, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import React, { useMemo } from "react";
import { useVideoContext } from "@/context/videoContext";
import { SiteKey } from "@/types/video";
import { buildPlatformBreakdown } from "./videosByPlatformUtils";

const PLATFORM_LABELS: Record<SiteKey, string> = {
  [SiteKey.YOUTUBE]: "YouTube",
  [SiteKey.YOUTUBE_MUSIC]: "YouTube Music",
  [SiteKey.CRUNCHYROLL]: "Crunchyroll",
};

const VideosByPlatform = () => {
  const { totalVideos } = useVideoContext();
  const breakdown = useMemo(() => buildPlatformBreakdown(totalVideos), [totalVideos]);

  if (breakdown.length < 2) {
    return null;
  }

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
      <Heading size="sm" color="accent.primary" mb={4}>
        Videos by Platform
      </Heading>
      <VStack align="stretch" spacing={3}>
        {breakdown.map((entry) => (
          <Box key={entry.origin} data-testid={`platform-row-${entry.origin}`}>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="sm" color="text.primary" fontWeight="medium">
                {PLATFORM_LABELS[entry.origin] ?? entry.origin}
              </Text>
              <Text fontSize="sm" color="text.secondary">
                {entry.count}
              </Text>
            </Flex>
            <Box bg="bg.tertiary" borderRadius="full" height="8px" overflow="hidden">
              <Box bg="accent.primary" borderRadius="full" height="full" width={`${entry.percentage}%`} transition="width 0.3s ease" />
            </Box>
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

export default VideosByPlatform;
