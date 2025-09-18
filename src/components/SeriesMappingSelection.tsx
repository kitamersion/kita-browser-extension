import React from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Image,
  Button,
  Badge,
  Skeleton,
  Alert,
  AlertIcon,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
} from "@chakra-ui/react";
import { ISeriesSearchResult } from "@/types/integrations/seriesMapping";
import { settingsNavigation } from "@/utils";
import { BsPatchQuestionFill } from "react-icons/bs";

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
  return (
    <Drawer onClose={onSkip} isOpen={isVisible} size={"full"} placement={"bottom"}>
      <DrawerOverlay />
      <DrawerContent p="6" bg="rgba(0, 0, 0, 0.95)" color="white">
        <DrawerCloseButton color="white" _hover={{ bg: "rgba(255, 99, 71, 0.2)" }} />
        <DrawerHeader color="tomato" fontSize="xl" fontWeight="bold" display="flex" alignItems="center" gap={2}>
          <BsPatchQuestionFill /> Multiple AniList matches
        </DrawerHeader>
        <DrawerBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="md" color="gray.300">
              Select correct match for <br /> <b>&ldquo;{seriesTitle}&rdquo;</b>
            </Text>

            {isLoading ? (
              <VStack spacing={3}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height="100px" width="100%" rounded="lg" startColor="gray.700" endColor="gray.600" />
                ))}
              </VStack>
            ) : searchResults.length === 0 ? (
              <Alert status="warning" bg="rgba(255, 99, 71, 0.1)" border="1px solid rgba(255, 99, 71, 0.3)" rounded="lg">
                <AlertIcon color="tomato" />
                <Text fontSize="sm" color="gray.200">
                  No matches found. You can skip for now.
                </Text>
              </Alert>
            ) : (
              <VStack spacing={4} align="stretch">
                {searchResults.map((result) => (
                  <Box
                    key={result.id}
                    p={4}
                    bg="rgba(255, 255, 255, 0.05)"
                    border="1px solid rgba(255, 255, 255, 0.1)"
                    rounded="lg"
                    cursor="pointer"
                    _hover={{
                      bg: "rgba(255, 99, 71, 0.1)",
                      borderColor: "rgba(255, 99, 71, 0.3)",
                      transform: "translateY(-2px)",
                    }}
                    transition="all 0.2s"
                    onClick={() => onSelect(result)}
                  >
                    <HStack spacing={4} align="start">
                      {result.coverImage?.extraLarge && (
                        <Image
                          src={result.coverImage.extraLarge}
                          alt=""
                          w="80px"
                          h="120px"
                          objectFit="cover"
                          rounded="md"
                          border="2px solid rgba(255, 255, 255, 0.1)"
                        />
                      )}
                      <VStack align="start" spacing={3} flex={1}>
                        <Text fontWeight="semibold" fontSize="lg" color="white" noOfLines={3}>
                          {result.title.english || result.title.romaji || result.title.native || "Unknown Title"}
                        </Text>
                        <HStack spacing={3}>
                          {result.seasonYear && (
                            <Badge bg="rgba(255, 99, 71, 0.8)" color="white" rounded="full" px={3} py={1}>
                              {result.seasonYear}
                            </Badge>
                          )}
                          {result.episodes && (
                            <Badge bg="rgba(72, 187, 120, 0.8)" color="white" rounded="full" px={3} py={1}>
                              {result.episodes} episodes
                            </Badge>
                          )}
                        </HStack>
                        {result.description && (
                          <Text fontSize="sm" color="gray.400" noOfLines={3}>
                            {result.description.replace(/<[^>]*>/g, "")}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}

            {/* Footer */}
            <HStack spacing={3} mt={6} justify="space-between">
              <Button
                variant="outline"
                onClick={onSkip}
                borderColor="rgba(255, 99, 71, 0.5)"
                color="tomato"
                _hover={{
                  bg: "rgba(255, 99, 71, 0.1)",
                  borderColor: "tomato",
                }}
              >
                Skip for now
              </Button>
              <Text fontSize="sm" color="gray.400">
                Showing {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </Text>
            </HStack>

            {/* Help Footer */}
            <Box mt={4} p={3} bg="rgba(255, 255, 255, 0.02)" border="1px solid rgba(255, 255, 255, 0.05)" rounded="lg">
              <Text fontSize="xs" color="gray.400" textAlign="center">
                Selected the wrong match? You can change it later in{" "}
                <Button
                  variant="link"
                  fontSize="xs"
                  color="tomato"
                  onClick={settingsNavigation}
                  _hover={{ color: "white" }}
                  p={0}
                  h="auto"
                  minW="auto"
                >
                  Settings → Mappings
                </Button>
              </Text>
            </Box>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default SeriesMappingSelection;
