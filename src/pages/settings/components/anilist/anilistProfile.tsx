import { GetMeQuery, MediaListStatus, useGetUserAnimeListLazyQuery, useSaveMediaListEntryMutation } from "@/graphql";
import { ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon, SettingsIcon } from "@chakra-ui/icons";
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
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { FaPlay, FaPause, FaCheck, FaRedo, FaTrash, FaCalendarPlus } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import db from "@/db";
import { useGetMeQuery } from "@/graphql";

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

const ANILIST_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const AnilistProfile = () => {
  const { isOpen: isEditModalOpen, onOpen: openEditModal, onClose: closeEditModal } = useDisclosure();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedEntry, setSelectedEntry] = useState<AnimeListEntry | null>(null);
  const [editProgress, setEditProgress] = useState<string>("");
  const [editStatus, setEditStatus] = useState<MediaListStatus>(MediaListStatus.Current);
  const [editScore, setEditScore] = useState<string>("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    [MediaListStatus.Current]: true, // Default open for Current
  });
  const [loadedStatuses, setLoadedStatuses] = useState<Record<string, boolean>>({});
  const [statusData, setStatusData] = useState<Record<string, any>>({});
  const [profile, setProfile] = useState<GetMeQuery["Viewer"] | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileCacheExpires, setProfileCacheExpires] = useState<number | null>(null);

  const [listCacheExpires, setListCacheExpires] = useState<Record<string, number | null>>({});

  const toast = useToast();

  const [getAnimeList, { loading: animeListLoading }] = useGetUserAnimeListLazyQuery();
  const [updateMediaList, { loading: isUpdating }] = useSaveMediaListEntryMutation();

  // Use the GetMeQuery hook
  const { refetch: refetchMe } = useGetMeQuery({
    skip: true,
  });

  const daysWatched = useMemo(() => {
    return profile?.statistics?.anime?.minutesWatched ? (profile.statistics.anime.minutesWatched / 1440).toFixed(2) : "0.00";
  }, [profile?.statistics?.anime?.minutesWatched]);

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
      if (profile?.id) {
        getAnimeList({
          variables: {
            userId: profile.id,
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
  }, [selectedEntry, editProgress, editStatus, editScore, updateMediaList, toast, profile?.id, getAnimeList, closeEditModal]);

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

  // Load profile and default open section on mount (with cache)
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setProfileLoading(true);
      const profileKey = "profile";
      const cachedProfileObj = await db.getAniListCacheRaw(profileKey); // get raw cache object
      if (cachedProfileObj && cachedProfileObj.value) {
        setProfile(cachedProfileObj.value);
        setProfileCacheExpires(cachedProfileObj.expires_at);
        setProfileLoading(false);
      } else {
        // Only fetch if cache is missing
        const { data: fetchedData } = await refetchMe();
        if (fetchedData?.Viewer && isMounted) {
          setProfile(fetchedData.Viewer);
          const expiresAt = Date.now() + ANILIST_CACHE_TTL;
          await db.setAniListCache(profileKey, fetchedData.Viewer, ANILIST_CACHE_TTL);
          setProfileCacheExpires(expiresAt);
        }
        if (isMounted) setProfileLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [refetchMe]);

  // Load anime list for the profile
  useEffect(() => {
    if (!profile?.id) return;
    setProfileLoading(true);
    const fetchList = async () => {
      // Anime list cache
      const listKey = `list:${profile.id}:${MediaListStatus.Current}`;
      const cachedList = await db.getAniListCache(listKey);
      if (cachedList) {
        setStatusData((prev) => ({ ...prev, [MediaListStatus.Current]: cachedList }));
        setLoadedStatuses((prev) => ({ ...prev, [MediaListStatus.Current]: true }));
        setProfileLoading(false);
      } else {
        getAnimeList({
          variables: {
            userId: profile.id,
            status: MediaListStatus.Current,
          },
          onCompleted: async (data) => {
            setStatusData((prev) => ({ ...prev, [MediaListStatus.Current]: data }));
            setLoadedStatuses((prev) => ({ ...prev, [MediaListStatus.Current]: true }));
            await db.setAniListCache(listKey, data);
            setProfileLoading(false);
          },
        });
      }
    };
    fetchList();
    // Only run when profile changes
  }, [profile, getAnimeList]);

  const toggleSection = async (status: string) => {
    const isOpening = !openSections[status];
    setOpenSections((prev) => ({ ...prev, [status]: !prev[status] }));
    // If opening a section and data hasn't been loaded yet, fetch it (with cache)
    if (isOpening && !loadedStatuses[status] && profile?.id) {
      const listKey = `list:${profile.id}:${status}`;
      const cachedList = await db.getAniListCache(listKey);
      if (cachedList) {
        setStatusData((prev) => ({ ...prev, [status]: cachedList }));
        setLoadedStatuses((prev) => ({ ...prev, [status]: true }));
      } else {
        getAnimeList({
          variables: {
            userId: profile.id,
            status: status as MediaListStatus,
          },
          onCompleted: async (data) => {
            setStatusData((prev) => ({ ...prev, [status]: data }));
            setLoadedStatuses((prev) => ({ ...prev, [status]: true }));
            await db.setAniListCache(listKey, data);
          },
        });
      }
    }
  };

  // Define the statuses we want to display
  const displayStatuses = useMemo(() => {
    return [MediaListStatus.Current, MediaListStatus.Paused, MediaListStatus.Planning, MediaListStatus.Completed];
  }, []);

  // Add a force refresh button
  const handleForceRefresh = async () => {
    setProfileLoading(true);
    const { data: fetchedData } = await refetchMe();
    if (fetchedData?.Viewer) {
      setProfile(fetchedData.Viewer);
      const expiresAt = Date.now() + ANILIST_CACHE_TTL;
      await db.setAniListCache("profile", fetchedData.Viewer, ANILIST_CACHE_TTL);
      setProfileCacheExpires(expiresAt);
    }
    setProfileLoading(false);
  };

  // Refresh handler for media list
  const handleForceRefreshList = async (status: string) => {
    if (!profile?.id) return;
    getAnimeList({
      variables: {
        userId: profile.id,
        status: status as MediaListStatus,
      },
      onCompleted: async (data) => {
        setStatusData((prev) => ({ ...prev, [status]: data }));
        setLoadedStatuses((prev) => ({ ...prev, [status]: true }));
        const expiresAt = Date.now() + ANILIST_CACHE_TTL;
        await db.setAniListCache(`list:${profile.id}:${status}`, data, ANILIST_CACHE_TTL);
        setListCacheExpires((prev) => ({ ...prev, [status]: expiresAt }));
      },
    });
  };

  // Load cache expiry times for all media lists on profile change
  useEffect(() => {
    const fetchAllListCacheExpires = async () => {
      if (!profile?.id) return;
      const newExpires: Record<string, number | null> = {};
      for (const status of displayStatuses) {
        const listKey = `list:${profile.id}:${status}`;
        const cached = await db.getAniListCacheRaw(listKey);
        newExpires[status] = cached?.expires_at ?? null;
      }
      setListCacheExpires(newExpires);
    };
    fetchAllListCacheExpires();
  }, [displayStatuses, profile, statusData]);

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
        {/* Cache Controls Drawer Trigger */}
        <Flex justifyContent="flex-end" mb={2}>
          <Button leftIcon={<SettingsIcon />} onClick={onOpen} colorScheme="blue" size="sm">
            Cache Controls
          </Button>
        </Flex>
        <Drawer isOpen={isOpen} onClose={onClose} size="md">
          <DrawerOverlay />
          <DrawerContent bg="bg.primary" color="text.primary">
            <DrawerHeader>Cache Controls</DrawerHeader>
            <DrawerCloseButton />
            <DrawerBody>
              <VStack align="stretch" spacing={6}>
                <Box>
                  <Heading as="h3" size="sm" mb={2}>
                    Profile Cache
                  </Heading>
                  <VStack align="stretch" spacing={3}>
                    <Text fontSize="sm" color="text.secondary">
                      Expires: {profileCacheExpires ? new Date(profileCacheExpires).toLocaleString() : "-"}
                    </Text>
                    <Button size="sm" colorScheme="blue" onClick={handleForceRefresh} isLoading={profileLoading}>
                      Force refresh profile
                    </Button>
                  </VStack>
                </Box>
                <Divider />
                <Box>
                  <Heading as="h3" size="sm" mb={2}>
                    Media List Cache
                  </Heading>
                  <VStack align="stretch" spacing={3}>
                    {displayStatuses.map((status) => (
                      <HStack key={status}>
                        <Badge colorScheme="blue">{status}</Badge>
                        <Text fontSize="sm" color="text.secondary">
                          {typeof listCacheExpires[status] === "number" && listCacheExpires[status] !== null
                            ? new Date(listCacheExpires[status]).toLocaleString()
                            : "-"}
                        </Text>
                        <Button size="xs" colorScheme="blue" onClick={() => handleForceRefreshList(status)}>
                          Force refresh
                        </Button>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        {/* User Profile Section */}
        {profileLoading ? (
          <Flex justifyContent="center" alignItems="center" minH="120px">
            <Spinner size="lg" color="accent.primary" thickness="4px" speed="0.7s" />
          </Flex>
        ) : (
          <Flex gap={4} alignItems="center">
            <Avatar name={profile?.name} src={profile?.avatar?.medium ?? ""} size="lg" />
            <Box flex={1}>
              <Heading size="md" color="text.primary" mb={1}>
                {profile?.name}
              </Heading>
              <Link
                href={profile?.siteUrl ?? "#"}
                isExternal
                target={"_blank"}
                color="accent.primary"
                fontSize="sm"
                _hover={{ opacity: 0.8 }}
              >
                View AniList profile <ExternalLinkIcon mx="2px" />
              </Link>
            </Box>
          </Flex>
        )}

        {/* Stats Grid */}
        {!profileLoading && (
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <Box bg="bg.tertiary" p={3} borderRadius="md" border="1px solid" borderColor="border.primary">
              <Text fontSize="sm" color="text.secondary">
                Anime Count
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="accent.primary">
                {profile?.statistics?.anime?.count || 0}
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
                {profile?.statistics?.manga?.count || 0}
              </Text>
            </Box>
            <Box bg="bg.tertiary" p={3} borderRadius="md" border="1px solid" borderColor="border.primary">
              <Text fontSize="sm" color="text.secondary">
                Chapters Read
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="accent.primary">
                {profile?.statistics?.manga?.chaptersRead || 0}
              </Text>
            </Box>
          </Grid>
        )}

        <Divider borderColor="border.primary" />

        {/* Anime Lists */}
        <VStack spacing={4} align="stretch">
          {displayStatuses.map((status) => {
            const listData = statusData[status];
            const entries = listData?.MediaListCollection?.lists?.[0]?.entries || [];
            const hasEntries = entries.length > 0;
            const isSectionOpen = openSections[status];
            const isLoading = isSectionOpen && !loadedStatuses[status] && animeListLoading;
            const showSpinner = isSectionOpen && isLoading && !hasEntries;

            return (
              <Box key={status}>
                <Button
                  variant="ghost"
                  rightIcon={isSectionOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  onClick={() => toggleSection(status)}
                  size="sm"
                  color="text.primary"
                  _hover={{ bg: "bg.tertiary", boxShadow: "md" }}
                  w="full"
                  justifyContent="space-between"
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <Text fontWeight="medium" letterSpacing={0.5}>
                    {status}
                  </Text>
                  {showSpinner && <Spinner size="sm" thickness="3px" color="accent.primary" speed="0.7s" />}
                </Button>

                <Collapse in={isSectionOpen} animateOpacity>
                  <VStack spacing={3} mt={4} align="stretch">
                    {hasEntries &&
                      entries.map((entry: any) => (
                        <Box
                          key={entry.id}
                          bg="bg.tertiary"
                          borderRadius="md"
                          p={3}
                          border="1px solid"
                          borderColor="border.primary"
                          _hover={{ borderColor: "border.accent", bg: "bg.secondary", boxShadow: "md" }}
                          transition="all 0.2s"
                        >
                          <Flex gap={3} alignItems="center">
                            <Image
                              src={entry.media.coverImage.medium}
                              alt={entry.media.title.userPreferred}
                              boxSize="60px"
                              objectFit="cover"
                              borderRadius="md"
                              fallbackSrc="/placeholder-anime.png"
                              border="1px solid"
                              borderColor="border.primary"
                              transition="all 0.2s"
                            />
                            <Box flex={1} minW={0}>
                              <Link
                                href={entry.media.siteUrl}
                                isExternal
                                color="text.primary"
                                fontWeight="medium"
                                fontSize="sm"
                                noOfLines={2}
                                _hover={{ color: "accent.primary", textDecoration: "underline" }}
                              >
                                {entry.media.title.userPreferred}
                              </Link>
                              <HStack spacing={2} mt={1}>
                                <Badge colorScheme={getStatusColor(entry.status)} size="sm" borderRadius="md">
                                  <Flex alignItems="center" gap={1}>
                                    {getStatusIcon(entry.status)}
                                    <Text fontSize="xs">{entry.status}</Text>
                                  </Flex>
                                </Badge>
                                {entry.media.format && (
                                  <Badge variant="outline" size="sm" color="text.tertiary" borderRadius="md">
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
                                  borderRadius="md"
                                  transition="all 0.2s"
                                />
                              </Box>
                            </Box>
                            <IconButton
                              aria-label="Edit entry"
                              icon={<MdEdit />}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditEntry(entry)}
                              _hover={{ bg: "bg.primary", boxShadow: "md" }}
                              borderRadius="md"
                              transition="all 0.2s"
                            />
                          </Flex>
                        </Box>
                      ))}
                    {!hasEntries && !showSpinner && (
                      <Text color="text.tertiary" textAlign="center" py={4} fontSize="sm" opacity={0.7}>
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
