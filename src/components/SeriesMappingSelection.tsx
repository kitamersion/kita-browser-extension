import React, { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Image,
  Button,
  Badge,
  Radio,
  RadioGroup,
  useColorModeValue,
  Skeleton,
  Alert,
  AlertIcon,
  Collapse,
  IconButton,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
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
  const [selectedId, setSelectedId] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const warningBg = useColorModeValue("orange.50", "orange.900");

  const handleConfirm = () => {
    const selectedResult = searchResults.find((result) => result.id.toString() === selectedId);
    if (selectedResult) {
      onSelect(selectedResult);
    }
  };

  const getPreferredTitle = (result: ISeriesSearchResult): string => {
    return result.title.english || result.title.romaji || result.title.native || "Unknown Title";
  };

  if (!isVisible) return null;

  return (
    <Box p={3} border="1px" borderColor="orange.300" borderRadius="md" bg={warningBg} mb={4} maxW="100%">
      <VStack align="stretch" spacing={3}>
        {/* Header */}
        <HStack justify="space-between" align="center">
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold" fontSize="sm" color="orange.700">
              🔍 Multiple AniList matches found
            </Text>
            <Text fontSize="xs" color="gray.600">
              Select correct match for &ldquo;{seriesTitle}&rdquo;
            </Text>
          </VStack>
          <IconButton
            size="xs"
            variant="ghost"
            icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label="Toggle results"
          />
        </HStack>

        <Collapse in={isExpanded} animateOpacity>
          {isLoading ? (
            <VStack spacing={2}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height="50px" width="100%" />
              ))}
            </VStack>
          ) : searchResults.length === 0 ? (
            <Alert status="warning" size="sm">
              <AlertIcon />
              <Text fontSize="xs">No matches found. You can skip for now.</Text>
            </Alert>
          ) : (
            <VStack spacing={2} align="stretch">
              <RadioGroup value={selectedId} onChange={setSelectedId} size="sm">
                <VStack spacing={1} align="stretch">
                  {searchResults.slice(0, 4).map((result) => (
                    <Box
                      key={result.id}
                      p={2}
                      border="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                      cursor="pointer"
                      _hover={{ bg: hoverBg }}
                      onClick={() => setSelectedId(result.id.toString())}
                      bg={selectedId === result.id.toString() ? hoverBg : bgColor}
                    >
                      <HStack spacing={2} align="center">
                        <Radio value={result.id.toString()} size="sm" />

                        {result.coverImage?.extraLarge && (
                          <Image
                            src={result.coverImage.extraLarge}
                            alt={getPreferredTitle(result)}
                            width="30px"
                            height="40px"
                            objectFit="cover"
                            borderRadius="sm"
                            fallback={<Box width="30px" height="40px" bg="gray.200" borderRadius="sm" />}
                          />
                        )}

                        <VStack align="start" flex={1} spacing={1}>
                          <Text fontWeight="medium" fontSize="xs" noOfLines={1}>
                            {getPreferredTitle(result)}
                          </Text>

                          <HStack spacing={1}>
                            {result.seasonYear && (
                              <Badge colorScheme="blue" variant="outline" fontSize="2xs" px={1} py={0}>
                                {result.seasonYear}
                              </Badge>
                            )}
                            {result.episodes && (
                              <Badge colorScheme="green" variant="outline" fontSize="2xs" px={1} py={0}>
                                {result.episodes}ep
                              </Badge>
                            )}
                          </HStack>
                        </VStack>
                      </HStack>
                    </Box>
                  ))}

                  {searchResults.length > 4 && (
                    <Text fontSize="2xs" color="gray.500" textAlign="center">
                      Showing first 4 of {searchResults.length} results
                    </Text>
                  )}
                </VStack>
              </RadioGroup>
            </VStack>
          )}
        </Collapse>

        {/* Action buttons */}
        <HStack spacing={2} justify="end">
          <Button size="xs" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button size="xs" colorScheme="blue" onClick={handleConfirm} isDisabled={!selectedId || isLoading}>
            Save Mapping
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default SeriesMappingSelection;
