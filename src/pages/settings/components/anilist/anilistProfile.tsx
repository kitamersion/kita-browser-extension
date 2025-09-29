import { GetMeQuery, MediaListStatus, useGetUserAnimeListLazyQuery, useSaveMediaListEntryMutation } from "@/graphql";
import { ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import {
  Avatar,
  Box,
  Flex,
  Heading,
  Link,
  Text,
  Button,
  Collapse,
  Grid,
  Image,
  Badge,
  Progress,
  IconButton,
  HStack,
  VStack,
  Divider,
  Input,
  Select,
  useToast,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { FaPlay, FaPause, FaCheck, FaRedo, FaTrash, FaCalendarPlus } from "react-icons/fa";
import { MdEdit } from "react-icons/md";

interface AnimeListEntry {
  id: number;
  mediaId: number;
  status: MediaListStatus;
  progress: number;
  score: number;
  media: {
    id: number;
    title: {
      romaji: string;
      english?: string;
      userPreferred: string;
    };
    coverImage: {
      medium: string;
      color?: string;
    };
    bannerImage?: string;
    episodes?: number;
    format: string;
    status: string;
    averageScore?: number;
    nextAiringEpisode?: {
      episode: number;
      timeUntilAiring: number;
    };
    siteUrl: string;
  };
}

const AnilistProfile = ({ Viewer }: GetMeQuery) => {
  const { isOpen: isEditModalOpen, onOpen: openEditModal, onClose: closeEditModal } = useDisclosure();
  const [selectedEntry, setSelectedEntry] = useState<AnimeListEntry | null>(null);
  const [editProgress, setEditProgress] = useState<string>("");
  const [editStatus, setEditStatus] = useState<MediaListStatus>(MediaListStatus.Current);
  const [editScore, setEditScore] = useState<string>("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    [MediaListStatus.Current]: true, // Default open for Current
  });
  const [loadedStatuses, setLoadedStatuses] = useState<Record<string, boolean>>({});
  const [statusData, setStatusData] = useState<Record<string, any>>({});

  const toast = useToast();

  const [getAnimeList, { loading: animeListLoading }] = useGetUserAnimeListLazyQuery();
  const [updateMediaList, { loading: isUpdating }] = useSaveMediaListEntryMutation();

  const daysWatched = useMemo(() => {
    return Viewer?.statistics?.anime?.minutesWatched ? (Viewer?.statistics?.anime?.minutesWatched / 1440).toFixed(2) : "0.00";
  }, [Viewer?.statistics?.anime?.minutesWatched]);

  useEffect(() => {
    if (Viewer?.id) {
      // Fetch all anime lists
      getAnimeList({
        variables: {
          userId: Viewer.id,
        },
      });
    }
  }, [Viewer?.id, getAnimeList]);

  const handleEditEntry = useCallback(
    (entry: AnimeListEntry) => {
      setSelectedEntry(entry);
      setEditProgress(entry.progress.toString());
      setEditStatus(entry.status);
      setEditScore(entry.score?.toString() || "");
      openEditModal();
    },
    [openEditModal]
  );

  const handleUpdateEntry = useCallback(async () => {
    if (!selectedEntry) return;

    try {
      const progress = parseInt(editProgress) || 0;
      const score = parseFloat(editScore) || undefined;

      // Determine status based on progress and total episodes
      let finalStatus = editStatus;
      if (selectedEntry.media.episodes && progress >= selectedEntry.media.episodes) {
        finalStatus = MediaListStatus.Completed;
      }

      await updateMediaList({
        variables: {
          mediaId: selectedEntry.mediaId,
          status: finalStatus,
          progress,
          score,
        },
      });

      toast({
        title: "Updated successfully!",
        description: `${selectedEntry.media.title.userPreferred} has been updated.`,
        status: "success",
        duration: 3000,
      });

      // Refresh the list
      if (Viewer?.id) {
        getAnimeList({
          variables: {
            userId: Viewer.id,
            status: finalStatus,
          },
        });
      }

      setSelectedEntry(null);
      closeEditModal();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update anime entry",
        status: "error",
        duration: 5000,
      });
    }
  }, [selectedEntry, editProgress, editStatus, editScore, updateMediaList, toast, Viewer?.id, getAnimeList, closeEditModal]);

  const getStatusIcon = (status: MediaListStatus) => {
    switch (status) {
      case MediaListStatus.Current:
        return <FaPlay color="green" />;
      case MediaListStatus.Completed:
        return <FaCheck color="blue" />;
      case MediaListStatus.Paused:
        return <FaPause color="orange" />;
      case MediaListStatus.Planning:
        return <FaCalendarPlus color="purple" />;
      case MediaListStatus.Dropped:
        return <FaTrash color="red" />;
      case MediaListStatus.Repeating:
        return <FaRedo color="teal" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: MediaListStatus) => {
    switch (status) {
      case MediaListStatus.Current:
        return "green";
      case MediaListStatus.Completed:
        return "blue";
      case MediaListStatus.Paused:
        return "orange";
      case MediaListStatus.Planning:
        return "purple";
      case MediaListStatus.Dropped:
        return "red";
      case MediaListStatus.Repeating:
        return "teal";
      default:
        return "gray";
    }
  };

  const toggleSection = (status: string) => {
    const isOpening = !openSections[status];
    setOpenSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));

    // If opening a section and data hasn't been loaded yet, fetch it
    if (isOpening && !loadedStatuses[status] && Viewer?.id) {
      getAnimeList({
        variables: {
          userId: Viewer.id,
          status: status as MediaListStatus,
        },
        onCompleted: (data) => {
          setStatusData((prev) => ({
            ...prev,
            [status]: data,
          }));
          setLoadedStatuses((prev) => ({
            ...prev,
            [status]: true,
          }));
        },
      });
    }
  };

  // Load default open section on mount
  useEffect(() => {
    if (Viewer?.id && !loadedStatuses[MediaListStatus.Current]) {
      getAnimeList({
        variables: {
          userId: Viewer.id,
          status: MediaListStatus.Current,
        },
        onCompleted: (data) => {
          setStatusData((prev) => ({
            ...prev,
            [MediaListStatus.Current]: data,
          }));
          setLoadedStatuses((prev) => ({
            ...prev,
            [MediaListStatus.Current]: true,
          }));
        },
      });
    }
  }, [Viewer?.id, getAnimeList, loadedStatuses]);

  // Define the statuses we want to display
  const displayStatuses = [MediaListStatus.Current, MediaListStatus.Paused, MediaListStatus.Planning, MediaListStatus.Completed];

  return (
    <Box
      bg="bg.secondary"
      border="1px solid"
      borderColor="border.primary"
      borderRadius="xl"
      p={6}
      _hover={{
        borderColor: "border.accent",
        boxShadow: "xl",
      }}
      transition="all 0.2s"
    >
      <VStack spacing={6} align="stretch">
        {/* User Profile Section */}
        <Flex gap={4} alignItems="center">
          <Avatar name={Viewer?.name} src={Viewer?.avatar?.medium ?? ""} size="lg" />
          <Box flex={1}>
            <Heading size="md" color="text.primary" mb={1}>
              {Viewer?.name}
            </Heading>
            <Link href={Viewer?.siteUrl ?? "#"} isExternal target={"_blank"} color="accent.primary" fontSize="sm" _hover={{ opacity: 0.8 }}>
              View AniList profile <ExternalLinkIcon mx="2px" />
            </Link>
          </Box>
        </Flex>

        {/* Stats Grid */}
        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
          <Box bg="bg.tertiary" p={3} borderRadius="md" border="1px solid" borderColor="border.primary">
            <Text fontSize="sm" color="text.secondary">
              Anime Count
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="accent.primary">
              {Viewer?.statistics?.anime?.count || 0}
            </Text>
          </Box>
          <Box bg="bg.tertiary" p={3} borderRadius="md" border="1px solid" borderColor="border.primary">
            <Text fontSize="sm" color="text.secondary">
              Days Watched
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="accent.primary">
              {daysWatched}
            </Text>
          </Box>
          <Box bg="bg.tertiary" p={3} borderRadius="md" border="1px solid" borderColor="border.primary">
            <Text fontSize="sm" color="text.secondary">
              Manga Count
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="accent.primary">
              {Viewer?.statistics?.manga?.count || 0}
            </Text>
          </Box>
          <Box bg="bg.tertiary" p={3} borderRadius="md" border="1px solid" borderColor="border.primary">
            <Text fontSize="sm" color="text.secondary">
              Chapters Read
            </Text>
            <Text fontSize="lg" fontWeight="bold" color="accent.primary">
              {Viewer?.statistics?.manga?.chaptersRead || 0}
            </Text>
          </Box>
        </Grid>

        <Divider borderColor="border.primary" />

        {/* Anime Lists */}
        <VStack spacing={4} align="stretch">
          {displayStatuses.map((status) => {
            const listData = statusData[status];
            const isLoading = openSections[status] && !loadedStatuses[status] && animeListLoading;

            return (
              <Box key={status}>
                <Button
                  variant="ghost"
                  rightIcon={openSections[status] ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  onClick={() => toggleSection(status)}
                  size="sm"
                  color="text.primary"
                  _hover={{ bg: "bg.tertiary" }}
                  w="full"
                  justifyContent="space-between"
                >
                  <Text fontWeight="medium">{status}</Text>
                  {isLoading && <Spinner size="sm" />}
                </Button>

                <Collapse in={openSections[status]} animateOpacity>
                  <VStack spacing={3} mt={4} align="stretch">
                    {listData?.MediaListCollection?.lists?.[0]?.entries?.map((entry: any) => (
                      <Box
                        key={entry.id}
                        bg="bg.tertiary"
                        borderRadius="md"
                        p={3}
                        border="1px solid"
                        borderColor="border.primary"
                        _hover={{
                          borderColor: "border.accent",
                          bg: "bg.secondary",
                        }}
                        transition="all 0.2s"
                      >
                        <Flex gap={3}>
                          <Image
                            src={entry.media.coverImage.medium}
                            alt={entry.media.title.userPreferred}
                            boxSize="60px"
                            objectFit="cover"
                            borderRadius="md"
                            fallbackSrc="/placeholder-anime.png"
                          />
                          <Box flex={1} minW={0}>
                            <Link
                              href={entry.media.siteUrl}
                              isExternal
                              color="text.primary"
                              fontWeight="medium"
                              fontSize="sm"
                              noOfLines={2}
                              _hover={{ color: "accent.primary" }}
                            >
                              {entry.media.title.userPreferred}
                            </Link>

                            <HStack spacing={2} mt={1}>
                              <Badge colorScheme={getStatusColor(entry.status)} size="sm">
                                <Flex alignItems="center" gap={1}>
                                  {getStatusIcon(entry.status)}
                                  <Text fontSize="xs">{entry.status}</Text>
                                </Flex>
                              </Badge>
                              {entry.media.format && (
                                <Badge variant="outline" size="sm" color="text.tertiary">
                                  {entry.media.format}
                                </Badge>
                              )}
                            </HStack>

                            <Box mt={2}>
                              <Flex alignItems="center" gap={2} mb={1}>
                                <Text fontSize="xs" color="text.secondary">
                                  Progress: {entry.progress}/{entry.media.episodes || "?"}
                                </Text>
                                {entry.media.nextAiringEpisode && (
                                  <Text fontSize="xs" color="accent.primary">
                                    EP {entry.media.nextAiringEpisode.episode} in{" "}
                                    {Math.floor(entry.media.nextAiringEpisode.timeUntilAiring / 3600)}h
                                  </Text>
                                )}
                              </Flex>
                              <Progress
                                value={entry.media.episodes ? (entry.progress / entry.media.episodes) * 100 : 0}
                                size="sm"
                                colorScheme="orange"
                                bg="bg.primary"
                              />
                            </Box>
                          </Box>
                          <IconButton
                            aria-label="Edit entry"
                            icon={<MdEdit />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditEntry(entry)}
                            _hover={{ bg: "bg.primary" }}
                          />
                        </Flex>
                      </Box>
                    ))}
                    {(!listData?.MediaListCollection?.lists?.[0]?.entries || listData.MediaListCollection.lists[0].entries.length === 0) &&
                      !isLoading && (
                        <Text color="text.tertiary" textAlign="center" py={4}>
                          No anime in {status}
                        </Text>
                      )}
                  </VStack>
                </Collapse>
              </Box>
            );
          })}
        </VStack>

        {/* Edit Modal */}
        <Modal isOpen={isEditModalOpen} onClose={closeEditModal} size="lg">
          <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
          <ModalContent bg="bg.primary" border="1px solid" borderColor="border.primary" boxShadow="2xl">
            <ModalHeader color="text.primary">
              {selectedEntry ? `Edit: ${selectedEntry.media.title.userPreferred}` : "Edit Entry"}
            </ModalHeader>
            <ModalCloseButton color="text.secondary" />

            <ModalBody pb={6}>
              {selectedEntry && (
                <VStack spacing={4} align="stretch">
                  <Flex gap={4} align="center">
                    <Image
                      src={selectedEntry.media.coverImage.medium}
                      alt={selectedEntry.media.title.userPreferred}
                      boxSize="80px"
                      objectFit="cover"
                      borderRadius="md"
                      fallbackSrc="/placeholder-anime.png"
                    />
                    <Box>
                      <Text fontWeight="bold" color="text.primary" mb={1}>
                        {selectedEntry.media.title.userPreferred}
                      </Text>
                      <Text fontSize="sm" color="text.secondary" mb={1}>
                        {selectedEntry.media.format} •{" "}
                        {selectedEntry.media.episodes ? `${selectedEntry.media.episodes} episodes` : "Ongoing"}
                      </Text>
                      <Flex gap={2} alignItems="center">
                        {selectedEntry.media.averageScore && (
                          <Text fontSize="sm" color="accent.primary">
                            ⭐ {selectedEntry.media.averageScore / 10}/10
                          </Text>
                        )}
                        <Link href={selectedEntry.media.siteUrl} isExternal color="accent.primary" fontSize="sm" _hover={{ opacity: 0.8 }}>
                          View on AniList <ExternalLinkIcon mx="2px" />
                        </Link>
                      </Flex>
                    </Box>
                  </Flex>

                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="text.primary" mb={2}>
                        Progress {selectedEntry.media.episodes ? `(Max: ${selectedEntry.media.episodes})` : ""}
                      </Text>
                      <Input
                        type="number"
                        value={editProgress}
                        onChange={(e) => setEditProgress(e.target.value)}
                        min="0"
                        max={selectedEntry.media.episodes || 9999}
                        bg="bg.tertiary"
                        borderColor="border.primary"
                        color="text.primary"
                        _focus={{ borderColor: "accent.primary" }}
                        placeholder={`Max: ${selectedEntry.media.episodes || "Unknown"}`}
                      />
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="text.primary" mb={2}>
                        Score (1-10)
                      </Text>
                      <Input
                        type="number"
                        value={editScore}
                        onChange={(e) => setEditScore(e.target.value)}
                        min="0"
                        max="10"
                        step="0.1"
                        bg="bg.tertiary"
                        borderColor="border.primary"
                        color="text.primary"
                        _focus={{ borderColor: "accent.primary" }}
                        placeholder="Optional"
                      />
                    </Box>
                  </Grid>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="text.primary" mb={2}>
                      Status
                    </Text>
                    <Select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as MediaListStatus)}
                      bg="bg.tertiary"
                      borderColor="border.primary"
                      color="text.primary"
                      _focus={{ borderColor: "accent.primary" }}
                    >
                      <option value={MediaListStatus.Current}>Current</option>
                      <option value={MediaListStatus.Completed}>Completed</option>
                      <option value={MediaListStatus.Paused}>Paused</option>
                      <option value={MediaListStatus.Dropped}>Dropped</option>
                      <option value={MediaListStatus.Planning}>Planning</option>
                      <option value={MediaListStatus.Repeating}>Repeating</option>
                    </Select>
                  </Box>
                </VStack>
              )}
            </ModalBody>

            <ModalFooter>
              <Button
                bg="accent.primary"
                color="white"
                mr={3}
                onClick={handleUpdateEntry}
                isLoading={isUpdating}
                _hover={{ bg: "accent.primary", opacity: 0.9 }}
              >
                Update
              </Button>
              <Button variant="ghost" onClick={closeEditModal} color="text.secondary" _hover={{ bg: "bg.tertiary" }}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

export default AnilistProfile;
