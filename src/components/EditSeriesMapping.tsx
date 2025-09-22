import React, { useState, useMemo } from "react";
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Select,
  useDisclosure,
  Text,
  Box,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";
import { ISeriesMapping } from "@/types/integrations/seriesMapping";
import { seriesMappingStorage } from "@/api/seriesMapping";
import logger from "@/config/logger";

interface EditSeriesMappingProps {
  mapping: ISeriesMapping;
  onMappingUpdated?: (updatedMapping: ISeriesMapping) => void;
}

const EditSeriesMapping: React.FC<EditSeriesMappingProps> = ({ mapping, onMappingUpdated }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [editedMapping, setEditedMapping] = useState<ISeriesMapping>(mapping);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when mapping changes
  React.useEffect(() => {
    setEditedMapping(mapping);
  }, [mapping]);

  const mappingJsonBlob = useMemo(() => JSON.stringify(editedMapping, null, 2), [editedMapping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedMapping((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (name: string) => (valueString: string, valueNumber: number) => {
    setEditedMapping((prev) => ({
      ...prev,
      [name]: isNaN(valueNumber) ? undefined : valueNumber,
    }));
  };

  const handleSwitchChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedMapping((prev) => ({
      ...prev,
      [name]: e.target.checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatedMapping = await seriesMappingStorage.updateMapping(editedMapping.id, {
        series_title: editedMapping.series_title,
        source_platform: editedMapping.source_platform,
        season_year: editedMapping.season_year,
        anilist_series_id: editedMapping.anilist_series_id,
        mal_series_id: editedMapping.mal_series_id,
        kitsu_series_id: editedMapping.kitsu_series_id,
        tmdb_series_id: editedMapping.tmdb_series_id,
        user_confirmed: editedMapping.user_confirmed,
        total_episodes: editedMapping.total_episodes,
        series_description: editedMapping.series_description,
        cover_image: editedMapping.cover_image,
      });

      if (updatedMapping) {
        toast({
          title: "Mapping updated successfully",
          description: `Updated mapping for "${updatedMapping.series_title}"`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        // Notify parent component
        if (onMappingUpdated) {
          onMappingUpdated(updatedMapping);
        }

        onClose();
        logger.info(`Successfully updated series mapping: ${updatedMapping.series_title}`);
      } else {
        throw new Error("Failed to update mapping");
      }
    } catch (error) {
      toast({
        title: "Error updating mapping",
        description: "Failed to update series mapping. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      logger.error("Failed to update series mapping");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <>
      <IconButton size="sm" variant="ghost" icon={<EditIcon />} aria-label="Edit mapping" onClick={onOpen} />
      <Drawer onClose={onClose} isOpen={isOpen} size="full" placement="bottom">
        <DrawerOverlay bg="blackAlpha.600" />
        <DrawerContent p="6" bg="bg.primary" color="text.primary">
          <DrawerCloseButton />
          <DrawerHeader color="accent.primary" fontSize="xl" fontWeight="bold">
            Editing Series Mapping
          </DrawerHeader>
          <DrawerBody>
            <form onSubmit={handleSubmit}>
              <Flex flexDirection="column" gap={4}>
                <FormControl id="series_title" isRequired>
                  <FormLabel>Series Title</FormLabel>
                  <Input
                    name="series_title"
                    value={editedMapping.series_title}
                    onChange={handleInputChange}
                    placeholder="Enter series title"
                  />
                </FormControl>

                <FormControl id="source_platform" isRequired>
                  <FormLabel>Source Platform</FormLabel>
                  <Select name="source_platform" value={editedMapping.source_platform} onChange={handleInputChange}>
                    <option value="crunchyroll">Crunchyroll</option>
                    <option value="netflix">Netflix</option>
                    <option value="hidive">Hidive</option>
                    <option value="youtube">YouTube</option>
                    <option value="funimation">Funimation</option>
                    <option value="hulu">Hulu</option>
                  </Select>
                </FormControl>

                <Flex gap={4}>
                  <FormControl id="season_year">
                    <FormLabel>Season Year</FormLabel>
                    <NumberInput
                      value={editedMapping.season_year || ""}
                      onChange={handleNumberChange("season_year")}
                      min={1950}
                      max={new Date().getFullYear() + 2}
                    >
                      <NumberInputField placeholder="e.g., 2024" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  <FormControl id="total_episodes">
                    <FormLabel>Total Episodes</FormLabel>
                    <NumberInput
                      value={editedMapping.total_episodes || ""}
                      onChange={handleNumberChange("total_episodes")}
                      min={1}
                      max={9999}
                    >
                      <NumberInputField placeholder="e.g., 24" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </Flex>

                <VStack spacing={4} align="stretch">
                  <Text fontWeight="bold" fontSize="lg">
                    Integration IDs
                  </Text>

                  <Flex gap={4}>
                    <FormControl id="anilist_series_id">
                      <FormLabel>AniList ID</FormLabel>
                      <NumberInput value={editedMapping.anilist_series_id || ""} onChange={handleNumberChange("anilist_series_id")} min={1}>
                        <NumberInputField placeholder="AniList series ID" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl id="mal_series_id">
                      <FormLabel>MyAnimeList ID</FormLabel>
                      <NumberInput value={editedMapping.mal_series_id || ""} onChange={handleNumberChange("mal_series_id")} min={1}>
                        <NumberInputField placeholder="MAL series ID" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                  </Flex>

                  <Flex gap={4}>
                    <FormControl id="kitsu_series_id">
                      <FormLabel>Kitsu ID</FormLabel>
                      <NumberInput value={editedMapping.kitsu_series_id || ""} onChange={handleNumberChange("kitsu_series_id")} min={1}>
                        <NumberInputField placeholder="Kitsu series ID" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl id="tmdb_series_id">
                      <FormLabel>TMDB ID</FormLabel>
                      <NumberInput value={editedMapping.tmdb_series_id || ""} onChange={handleNumberChange("tmdb_series_id")} min={1}>
                        <NumberInputField placeholder="TMDB series ID" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>
                  </Flex>
                </VStack>

                <FormControl id="cover_image">
                  <FormLabel>Cover Image URL</FormLabel>
                  <Input
                    name="cover_image"
                    value={editedMapping.cover_image || ""}
                    onChange={handleInputChange}
                    placeholder="https://example.com/cover.jpg"
                  />
                </FormControl>

                <FormControl id="background_cover_image">
                  <FormLabel>Background Cover Image URL</FormLabel>
                  <Input
                    name="background_cover_image"
                    value={editedMapping.background_cover_image || ""}
                    onChange={handleInputChange}
                    placeholder="https://example.com/background-cover.jpg"
                  />
                </FormControl>

                <FormControl id="banner_image">
                  <FormLabel>Banner Image URL</FormLabel>
                  <Input
                    name="banner_image"
                    value={editedMapping.banner_image || ""}
                    onChange={handleInputChange}
                    placeholder="https://example.com/banner.jpg"
                  />
                </FormControl>

                <FormControl id="series_description">
                  <FormLabel>Series Description</FormLabel>
                  <Textarea
                    name="series_description"
                    value={editedMapping.series_description || ""}
                    onChange={handleInputChange}
                    placeholder="Brief description of the series"
                    rows={3}
                  />
                </FormControl>

                <FormControl id="user_confirmed" display="flex" alignItems="center">
                  <FormLabel mb="0">User Confirmed</FormLabel>
                  <Switch isChecked={editedMapping.user_confirmed} onChange={handleSwitchChange("user_confirmed")} />
                </FormControl>

                <VStack spacing={2} align="stretch" mt={4}>
                  <Text fontSize="sm" color="text.tertiary">
                    Created: {formatDate(editedMapping.created_at)}
                  </Text>
                  <Text fontSize="sm" color="text.tertiary">
                    Last Updated: {formatDate(editedMapping.updated_at)}
                  </Text>
                  <Text fontSize="sm" color="text.tertiary">
                    Expires: {formatDate(editedMapping.expires_at)}
                  </Text>
                </VStack>

                <Button mt={4} type="submit" variant="kita" isLoading={isSubmitting} loadingText="Saving...">
                  Save Changes
                </Button>
              </Flex>
            </form>

            <Box width="full" my={5} bg="bg.secondary" border="1px solid" borderColor="border.primary" rounded="lg" p={4}>
              <Text fontWeight="bold" mb={2} color="text.primary">
                JSON Data (for debugging)
              </Text>
              <Textarea
                value={mappingJsonBlob}
                mb="4"
                minHeight="200px"
                readOnly
                fontSize="sm"
                fontFamily="mono"
                bg="bg.primary"
                color="text.primary"
              />
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default EditSeriesMapping;
