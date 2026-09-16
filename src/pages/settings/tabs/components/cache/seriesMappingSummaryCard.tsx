import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, HStack, Heading, Stat, StatLabel, StatNumber, Text, useToast } from "@chakra-ui/react";
import { MdCompareArrows } from "react-icons/md";
import { logger } from "@kitamersion/kita-logging";
import { SeriesMappingUtils } from "@/utils/seriesMappingUtils";
import eventbus from "@/api/eventbus";
import { SETTINGS_NAVIGATE } from "@/data/settingsNav";

type MappingStats = Awaited<ReturnType<typeof SeriesMappingUtils.getMappingStats>>;

const SeriesMappingSummaryCard: React.FC = () => {
  const toast = useToast();
  const [stats, setStats] = useState<MappingStats | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStats(await SeriesMappingUtils.getMappingStats());
    } catch (error) {
      logger.error("Failed to load series mapping stats");
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleClearExpired = async () => {
    setIsCleaning(true);
    try {
      const cleanedCount = await SeriesMappingUtils.cleanExpiredMappings();
      await loadStats();
      toast({ title: `Removed ${cleanedCount} expired mappings`, status: "success", duration: 3000 });
    } catch (error) {
      toast({ title: "Failed to clear expired mappings", status: "error", duration: 5000 });
    } finally {
      setIsCleaning(false);
    }
  };

  const handleNavigateToMappings = () => {
    eventbus.publish(SETTINGS_NAVIGATE, { message: "Navigate to series mappings", value: { id: "mappings" } });
  };

  return (
    <Box
      as="section"
      bg="bg.secondary"
      border="1px solid"
      borderColor="border.primary"
      rounded="lg"
      p={4}
      data-testid="cache-category-mappings"
    >
      <HStack justify="space-between" align="flex-start">
        <HStack>
          <MdCompareArrows />
          <Heading size="sm" color="text.primary">
            Series Mappings
          </Heading>
        </HStack>
        <Button size="xs" variant="kita-outline" onClick={handleNavigateToMappings} data-testid="navigate-to-mappings-button">
          Manage in Series Mappings
        </Button>
      </HStack>
      <Text color="text.secondary" fontSize="sm" mt={1}>
        Title-to-AniList matches used for auto-tagging. Fully managed in Organize → Series Mappings — this is a summary.
      </Text>
      <HStack spacing={6} mt={3}>
        <Stat>
          <StatLabel color="text.secondary">Total mappings</StatLabel>
          <StatNumber color="text.primary">{stats?.total ?? "—"}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel color="text.secondary">Expiring soon</StatLabel>
          <StatNumber color="text.primary">{stats?.expiringSoon ?? "—"}</StatNumber>
        </Stat>
      </HStack>
      <Button
        size="xs"
        colorScheme="red"
        variant="outline"
        mt={3}
        onClick={handleClearExpired}
        isLoading={isCleaning}
        isDisabled={!stats || stats.expiringSoon === 0}
        data-testid="clear-expired-mappings-button"
      >
        Clear expired mappings
      </Button>
    </Box>
  );
};

export default SeriesMappingSummaryCard;
