import React, { useState, useEffect, useCallback } from "react";
import {
  TabPanel,
  VStack,
  HStack,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Box,
  Text,
  Badge,
  Image,
  IconButton,
  Alert,
  AlertIcon,
  Flex,
  Select,
  Spinner,
  useToast,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
} from "@chakra-ui/react";
import { SearchIcon, DeleteIcon, ExternalLinkIcon, DownloadIcon, RepeatIcon } from "@chakra-ui/icons";
import { seriesMappingStorage } from "@/api/seriesMapping";
import { SeriesMappingUtils } from "@/utils/seriesMappingUtils";
import { ISeriesMapping, SourcePlatform } from "@/types/integrations/seriesMapping";
import logger from "@/config/logger";
import EditSeriesMapping from "@/components/EditSeriesMapping";

const SeriesMappingsTab = () => {
  const toast = useToast();
  const [mappings, setMappings] = useState<ISeriesMapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<ISeriesMapping[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<SourcePlatform | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Load mappings and stats
  const loadMappings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allMappings, mappingStats] = await Promise.all([seriesMappingStorage.getAllMappings(), SeriesMappingUtils.getMappingStats()]);
      setMappings(allMappings);
      setStats(mappingStats);
      logger.info(`Loaded ${allMappings.length} series mappings`);
    } catch (error) {
      toast({
        title: "Error loading mappings",
        description: "Failed to load series mappings from storage",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      logger.error("Failed to load mappings");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Filter mappings based on search and platform
  useEffect(() => {
    let filtered = mappings;

    // Filter by platform
    if (selectedPlatform !== "all") {
      filtered = filtered.filter((mapping) => mapping.source_platform === selectedPlatform);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (mapping) => mapping.series_title.toLowerCase().includes(lowercaseSearch) || mapping.normalized_title.includes(lowercaseSearch)
      );
    }

    setFilteredMappings(filtered);
  }, [mappings, searchTerm, selectedPlatform]);

  // Load data on mount
  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  // Delete mapping
  const handleDeleteMapping = async (mappingId: string, seriesTitle: string) => {
    try {
      const success = await seriesMappingStorage.removeMapping(mappingId);
      if (success) {
        await loadMappings(); // Reload the list
        toast({
          title: "Mapping deleted",
          description: `Removed mapping for "${seriesTitle}"`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Error deleting mapping",
        description: "Failed to delete series mapping",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      logger.error("Failed to delete mapping");
    }
  };

  // Export mappings
  const handleExportMappings = async () => {
    try {
      const jsonData = await SeriesMappingUtils.exportMappings();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kita-series-mappings-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Series mappings exported to file",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export series mappings",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      logger.error("Failed to export mappings");
    }
  };

  // Clean expired mappings
  const handleCleanExpired = async () => {
    try {
      const cleanedCount = await SeriesMappingUtils.cleanExpiredMappings();
      await loadMappings(); // Reload the list
      toast({
        title: "Cleanup complete",
        description: `Removed ${cleanedCount} expired mappings`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Cleanup failed",
        description: "Failed to clean expired mappings",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      logger.error("Failed to clean expired mappings");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpiringSoon = (expiresAt: number) => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    return expiresAt - Date.now() < thirtyDaysMs;
  };

  return (
    <TabPanel>
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <VStack spacing={4} align="stretch">
          <Heading size="lg" color="accent.primary">
            Series Mappings Management
          </Heading>
          <Text color="text.secondary" fontSize="sm">
            Manage your anime series mappings between streaming platforms and AniList. These mappings help sync your watch progress
            accurately.
          </Text>
        </VStack>

        {/* Stats Overview */}
        {stats && (
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Box
              bg="bg.secondary"
              border="1px solid"
              borderColor="border.primary"
              rounded="xl"
              p={6}
              transition="all 0.2s"
              _hover={{ bg: "kita.primaryAlpha.100", borderColor: "kita.border.accent", boxShadow: "xl" }}
            >
              <Stat>
                <StatLabel color="text.secondary">Total Mappings</StatLabel>
                <StatNumber color="accent.primary">{stats.total}</StatNumber>
              </Stat>
            </Box>
            <Box
              bg="bg.secondary"
              border="1px solid"
              borderColor="border.primary"
              rounded="xl"
              p={6}
              transition="all 0.2s"
              _hover={{ bg: "kita.primaryAlpha.100", borderColor: "kita.border.accent", boxShadow: "xl" }}
            >
              <Stat>
                <StatLabel color="text.secondary">User Confirmed</StatLabel>
                <StatNumber color="kita.success">{stats.userConfirmed}</StatNumber>
              </Stat>
            </Box>
            <Box
              bg="bg.secondary"
              border="1px solid"
              borderColor="border.primary"
              rounded="xl"
              p={6}
              transition="all 0.2s"
              _hover={{ bg: "kita.primaryAlpha.100", borderColor: "kita.border.accent", boxShadow: "xl" }}
            >
              <Stat>
                <StatLabel color="text.secondary">Auto Generated</StatLabel>
                <StatNumber color="text.primary">{stats.autoGenerated}</StatNumber>
              </Stat>
            </Box>
            <Box
              bg="bg.secondary"
              border="1px solid"
              borderColor="border.primary"
              rounded="xl"
              p={6}
              transition="all 0.2s"
              _hover={{ bg: "kita.primaryAlpha.100", borderColor: "kita.border.accent", boxShadow: "xl" }}
            >
              <Stat>
                <StatLabel color="text.secondary">Expiring Soon</StatLabel>
                <StatNumber color={stats.expiringSoon > 0 ? "orange.400" : "text.primary"}>{stats.expiringSoon}</StatNumber>
              </Stat>
            </Box>
          </SimpleGrid>
        )}

        {/* Controls */}
        <Box
          bg="bg.secondary"
          border="1px solid"
          borderColor="border.primary"
          rounded="xl"
          p={6}
          transition="all 0.2s"
          _hover={{ bg: "kita.primaryAlpha.100", borderColor: "kita.border.accent", boxShadow: "xl" }}
        >
          <VStack spacing={4}>
            <Flex gap={4} wrap="wrap" align="center" w="full" alignItems="center">
              {/* Search */}
              <InputGroup maxW="300px">
                <InputLeftElement>
                  <SearchIcon color="text.tertiary" />
                </InputLeftElement>
                <Input
                  rounded="lg"
                  placeholder="Search by series title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                  bg="bg.tertiary"
                  borderColor="border.secondary"
                  color="text.primary"
                  _placeholder={{ color: "text.tertiary" }}
                  _hover={{ borderColor: "border.primary" }}
                  _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
                />
              </InputGroup>

              {/* Platform filter */}
              <Select
                rounded="lg"
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value as SourcePlatform | "all")}
                maxW="200px"
                size="sm"
                bg="bg.tertiary"
                borderColor="border.secondary"
                color="text.primary"
                _hover={{ borderColor: "border.primary" }}
                _focus={{ borderColor: "accent.primary" }}
              >
                <option value="all">All Platforms</option>
                <option value="crunchyroll">Crunchyroll</option>
                <option value="netflix">Netflix</option>
                <option value="hidive">Hidive</option>
                <option value="youtube">YouTube</option>
                <option value="funimation">Funimation</option>
                <option value="hulu">Hulu</option>
              </Select>

              {/* Action buttons */}
              <HStack spacing={2} ml="auto">
                <Button variant="kita-outline" size="sm" leftIcon={<RepeatIcon />} onClick={loadMappings} isLoading={isLoading}>
                  Refresh
                </Button>
                <Button variant="kita" size="sm" leftIcon={<DownloadIcon />} onClick={handleExportMappings}>
                  Export
                </Button>
                <Button size="sm" variant="outline" colorScheme="red" onClick={handleCleanExpired}>
                  Clean Expired
                </Button>
              </HStack>
            </Flex>
          </VStack>
        </Box>

        <Divider borderColor="border.primary" />

        {/* Mappings List */}
        {isLoading ? (
          <Flex justify="center" py={8}>
            <Spinner size="lg" />
          </Flex>
        ) : filteredMappings.length === 0 ? (
          <Alert status="info" variant="kita" rounded="3xl">
            <AlertIcon />
            {mappings.length === 0
              ? "No series mappings found. Mappings are created automatically when you sync with AniList."
              : searchTerm || selectedPlatform !== "all"
                ? "No mappings match your current filters."
                : "No mappings to display."}
          </Alert>
        ) : (
          <VStack align="stretch" spacing={4}>
            <Text fontSize="sm" color="text.tertiary">
              Showing {filteredMappings.length} of {mappings.length} mappings
            </Text>

            {filteredMappings.map((mapping) => (
              <Box
                key={mapping.id}
                bg="bg.secondary"
                border="1px solid"
                borderColor="border.primary"
                rounded="xl"
                p={6}
                transition="all 0.2s"
                _hover={{ bg: "kita.primaryAlpha.100", borderColor: "kita.border.accent", boxShadow: "xl" }}
              >
                <HStack spacing={4} align="start">
                  {/* Cover Image (if available) */}
                  {(mapping.cover_image || mapping.background_cover_image) && (
                    <Image
                      src={mapping.cover_image || mapping.background_cover_image}
                      alt={mapping.series_title}
                      width="60px"
                      height="80px"
                      objectFit="cover"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="border.primary"
                      fallback={<Box width="60px" height="80px" bg="bg.tertiary" borderRadius="md" />}
                    />
                  )}

                  {/* Content */}
                  <VStack align="start" flex={1} spacing={2}>
                    {/* Title and badges */}
                    <HStack wrap="wrap" spacing={2}>
                      <Text fontWeight="bold" fontSize="lg" color="text.primary">
                        {mapping.series_title}
                      </Text>
                      <Badge variant="kita">{mapping.source_platform}</Badge>
                      {mapping.season_year && <Badge variant="kita-success">{mapping.season_year}</Badge>}
                      {mapping.user_confirmed && (
                        <Badge colorScheme="purple" variant="solid">
                          User Confirmed
                        </Badge>
                      )}
                      {isExpiringSoon(mapping.expires_at) && (
                        <Badge colorScheme="orange" variant="solid">
                          Expiring Soon
                        </Badge>
                      )}
                    </HStack>

                    {/* Details */}
                    <VStack align="start" spacing={1}>
                      <HStack>
                        <Text fontSize="sm" color="text.secondary">
                          AniList ID:
                        </Text>
                        <Text fontSize="sm" fontWeight="medium" color="accent.primary">
                          {mapping.anilist_series_id}
                        </Text>
                        {mapping.mal_series_id && (
                          <>
                            <Text fontSize="sm" color="text.secondary">
                              • MAL ID:
                            </Text>
                            <Text fontSize="sm" fontWeight="medium" color="text.primary">
                              {mapping.mal_series_id}
                            </Text>
                          </>
                        )}
                      </HStack>

                      <HStack fontSize="xs" color="text.tertiary">
                        <Text>Created: {formatDate(mapping.created_at)}</Text>
                        <Text>•</Text>
                        <Text>Expires: {formatDate(mapping.expires_at)}</Text>
                        {mapping.total_episodes && (
                          <>
                            <Text>•</Text>
                            <Text>{mapping.total_episodes} episodes</Text>
                          </>
                        )}
                      </HStack>
                    </VStack>
                  </VStack>

                  {/* Actions */}
                  <VStack spacing={1}>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={<ExternalLinkIcon />}
                      aria-label="View on AniList"
                      onClick={() => window.open(`https://anilist.co/anime/${mapping.anilist_series_id}`, "_blank")}
                    />
                    <EditSeriesMapping
                      mapping={mapping}
                      onMappingUpdated={(updatedMapping) => {
                        // Update the mapping in the local state
                        setMappings((prev) => prev.map((m) => (m.id === updatedMapping.id ? updatedMapping : m)));
                        setFilteredMappings((prev) => prev.map((m) => (m.id === updatedMapping.id ? updatedMapping : m)));
                      }}
                    />
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={<DeleteIcon />}
                      aria-label="Delete mapping"
                      colorScheme="red"
                      onClick={() => handleDeleteMapping(mapping.id, mapping.series_title)}
                    />
                  </VStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </TabPanel>
  );
};

export default SeriesMappingsTab;
