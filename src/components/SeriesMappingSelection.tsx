import React from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Image,
  Button,
  Badge,
  useColorModeValue,
  Skeleton,
  Alert,
  AlertIcon,
  IconButton,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { ISeriesSearchResult } from "@/types/integrations/seriesMapping";

interface SeriesMappingSelectionProps {
  isVisible: boolean;
  onSelect: (selectedResult: ISeriesSearchResult) => void;
  onSkip: () => void;
  seriesTitle: string;
  searchResults: ISeriesSearchResult[];
  isLoading?: boolean;
}

const SeriesMappingSelection: React.FC<SeriesMappingSelectionProps> = ({
  isVisible,
  onSelect,
  onSkip,
  seriesTitle,
  searchResults,
  isLoading = false,
}) => {
  const bgColor = useColorModeValue("orange.50", "orange.900");
  const borderColor = useColorModeValue("orange.200", "orange.600");

  if (!isVisible) return null;

  return (
    <Box w="100%" p={3} border="1px" borderColor={borderColor} borderRadius="md" bg={bgColor} mb={3}>
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold" fontSize="sm" color="orange.700">
              🔍 Multiple AniList matches found
            </Text>
            <Text fontSize="xs" color="gray.600">
              Select correct match for &ldquo;{seriesTitle}&rdquo;
            </Text>
          </VStack>
          <IconButton size="xs" variant="ghost" icon={<CloseIcon />} onClick={onSkip} aria-label="Close selection" />
        </HStack>

        {isLoading ? (
          <VStack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height="60px" width="100%" />
            ))}
          </VStack>
        ) : searchResults.length === 0 ? (
          <Alert status="warning" size="sm">
            <AlertIcon />
            <Text fontSize="xs">No matches found. You can skip for now.</Text>
          </Alert>
        ) : (
          <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
            {searchResults.map((result) => (
              <Box
                key={result.id}
                p={2}
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
                onClick={() => onSelect(result)}
              >
                <HStack spacing={2} align="start">
                  {result.coverImage?.extraLarge && (
                    <Image src={result.coverImage.extraLarge} alt="" w="40px" h="60px" objectFit="cover" borderRadius="sm" />
                  )}
                  <VStack align="start" spacing={1} flex={1}>
                    <Text fontWeight="semibold" fontSize="sm">
                      {result.title.english || result.title.romaji || result.title.native || "Unknown Title"}
                    </Text>
                    <HStack spacing={2}>
                      {result.seasonYear && (
                        <Badge size="sm" colorScheme="blue">
                          {result.seasonYear}
                        </Badge>
                      )}
                      {result.episodes && (
                        <Badge size="sm" colorScheme="green">
                          {result.episodes} eps
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}

        <HStack spacing={2}>
          <Button size="sm" variant="outline" onClick={onSkip}>
            Skip for now
          </Button>
          <Text fontSize="xs" color="gray.500" flex={1}>
            Showing {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );
};

export default SeriesMappingSelection;
