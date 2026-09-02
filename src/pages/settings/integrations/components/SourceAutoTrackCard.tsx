import React, { useEffect, useState } from "react";
import { Box, Divider, Flex, FormControl, FormLabel, Heading, NumberInput, NumberInputField, Switch, Text } from "@chakra-ui/react";
import { useAnilistContext } from "@/context/anilistContext";
import { getSourceAutoSyncConfig, getSourceAutoTrackConfig, setSourceAutoSyncConfig, setSourceAutoTrackConfig } from "@/api/sourceTracking";
import { SourceAutoSyncConfig, SourceAutoTrackConfig } from "@/types/integrations/sourceTracking";
import { SourcePlatform } from "@/types/integrations/seriesMapping";
import LoadingState from "@/components/states/LoadingState";

interface SourceAutoTrackCardProps {
  platform: SourcePlatform;
  title: string;
  icon: React.ReactNode;
  supportsAutoSync?: boolean;
}

const SourceAutoTrackCard = ({ platform, title, icon, supportsAutoSync = true }: SourceAutoTrackCardProps) => {
  const { anilistIsAuthorized } = useAnilistContext();
  const [trackConfig, setTrackConfig] = useState<SourceAutoTrackConfig>({ enabled: false, watchPercentage: 80 });
  const [syncConfig, setSyncConfig] = useState<SourceAutoSyncConfig>({ enabled: false });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getSourceAutoTrackConfig(platform), getSourceAutoSyncConfig(platform)]).then(([loadedTrack, loadedSync]) => {
      if (isMounted) {
        setTrackConfig(loadedTrack);
        setSyncConfig(loadedSync);
        setIsLoaded(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [platform]);

  const handleTrackToggle = () => {
    const updated = { ...trackConfig, enabled: !trackConfig.enabled };
    setTrackConfig(updated);
    setSourceAutoTrackConfig(platform, updated);
  };

  const handlePercentageChange = (valueString: string) => {
    const parsed = parseInt(valueString, 10);
    const watchPercentage = Number.isNaN(parsed) ? trackConfig.watchPercentage : parsed;
    const updated = { ...trackConfig, watchPercentage };
    setTrackConfig(updated);
    setSourceAutoTrackConfig(platform, updated);
  };

  const handleSyncToggle = () => {
    const updated = { ...syncConfig, enabled: !syncConfig.enabled };
    setSyncConfig(updated);
    setSourceAutoSyncConfig(platform, updated);
  };

  if (!isLoaded) {
    return <LoadingState />;
  }

  return (
    <Box
      width={"full"}
      boxShadow={"dark-lg"}
      rounded={"2xl"}
      p={4}
      bg="bg.secondary"
      border="1px solid"
      borderColor="border.primary"
      _hover={{
        borderColor: "border.accent",
        boxShadow: "2xl",
      }}
      transition="all 0.2s"
    >
      <Flex flexDirection={"column"} gap={4}>
        <Heading as="h2" fontWeight={"bold"} fontSize={"large"} color="text.primary" display="flex" alignItems="center" gap={2}>
          {icon}
          {title}
        </Heading>

        <Flex justifyContent={"space-between"} alignItems={"center"}>
          <Text color="text.secondary" fontSize="sm">
            Auto-track videos in Kita
          </Text>
          <Switch isChecked={trackConfig.enabled} onChange={handleTrackToggle} aria-label={`Toggle auto-track for ${title}`} />
        </Flex>

        {trackConfig.enabled && (
          <FormControl id={`${platform}-auto-track-percentage`}>
            <FormLabel color="text.secondary" fontSize="sm">
              Auto-track at % watched
            </FormLabel>
            <NumberInput value={trackConfig.watchPercentage} min={1} max={100} onChange={handlePercentageChange}>
              <NumberInputField aria-label={`Auto-track percentage for ${title}`} />
            </NumberInput>
          </FormControl>
        )}

        {supportsAutoSync && (
          <>
            <Divider borderColor="border.primary" />

            <Flex justifyContent={"space-between"} alignItems={"center"}>
              <Text color="text.secondary" fontSize="sm">
                Auto Sync to connected integrations
              </Text>
              <Switch
                isChecked={syncConfig.enabled}
                isDisabled={!anilistIsAuthorized}
                onChange={handleSyncToggle}
                aria-label={`Toggle auto-sync for ${title}`}
              />
            </Flex>
            {!anilistIsAuthorized && (
              <Text color="text.secondary" fontSize="sm">
                Connect AniList to enable auto-sync for {title}.
              </Text>
            )}
          </>
        )}
      </Flex>
    </Box>
  );
};

export default SourceAutoTrackCard;
