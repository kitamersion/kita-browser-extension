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
      <DrawerOverlay bg="blackAlpha.600" />
      <DrawerContent p="6" bg="bg.primary" color="text.primary">
        <DrawerCloseButton />
        <DrawerHeader color="accent.primary" fontSize="xl" fontWeight="bold" display="flex" alignItems="center" gap={2}>
          <BsPatchQuestionFill /> Multiple AniList matches
        </DrawerHeader>
        <DrawerBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="md" color="text.secondary">
              Select correct match for <br /> <b>&ldquo;{seriesTitle}&rdquo;</b>
            </Text>

            {isLoading ? (
              <VStack spacing={3}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height="100px" width="100%" rounded="lg" />
                ))}
              </VStack>
            ) : searchResults.length === 0 ? (
              <Alert variant="kita">
                <AlertIcon color="accent.primary" />
                <Text fontSize="sm" color="text.primary">
                  No matches found. You can skip for now.
                </Text>
              </Alert>
            ) : (
              <VStack spacing={4} align="stretch">
                {searchResults.map((result) => (
                  <Box
                    key={result.id}
                    bg="bg.secondary"
                    border="1px solid"
                    borderColor="border.primary"
                    rounded="lg"
                    p={4}
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{
                      bg: "kita.primaryAlpha.100",
                      borderColor: "kita.border.accent",
                      transform: "translateY(-2px)",
                    }}
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
                          border="2px solid"
                          borderColor="border.primary"
                        />
                      )}
                      <VStack align="start" spacing={3} flex={1}>
                        <Text fontWeight="semibold" fontSize="lg" color="text.primary" noOfLines={3}>
                          {result.title.english || result.title.romaji || result.title.native || "Unknown Title"}
                        </Text>
                        <HStack spacing={3}>
                          {result.seasonYear && <Badge variant="kita">{result.seasonYear}</Badge>}
                          {result.episodes && <Badge variant="kita-success">{result.episodes} episodes</Badge>}
                        </HStack>
                        {result.description && (
                          <Text fontSize="sm" color="text.tertiary" noOfLines={3}>
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
              <Button variant="kita-outline" onClick={onSkip}>
                Skip for now
              </Button>
              <Text fontSize="sm" color="text.tertiary">
                Showing {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </Text>
            </HStack>

            {/* Help Footer */}
            <Box mt={4} p={3} bg="bg.tertiary" border="1px solid" borderColor="border.secondary" rounded="lg">
              <Text fontSize="xs" color="text.tertiary" textAlign="center">
                Selected the wrong match? You can change it later in{" "}
                <Button
                  variant="link"
                  fontSize="xs"
                  color="accent.primary"
                  onClick={settingsNavigation}
                  _hover={{ color: "text.primary" }}
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
