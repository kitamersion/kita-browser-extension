import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  HStack,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useApolloClient } from "@apollo/client";
import { MediaListStatus, useGetMeQuery } from "@/graphql";
import { GET_GENRE_COLLECTION } from "@/graphql/queries/getGenreCollection";
import { GET_MEDIA_TAG_COLLECTION } from "@/graphql/queries/getMediaTagCollection";
import { GET_USER_ANIME_LIST } from "@/graphql/queries/getUserAnimeList";
import db from "@/db";
import {
  AniListCacheCategory,
  AniListCacheCategorySummary,
  clearAllCache,
  clearCacheCategory,
  deleteCacheEntry,
  getCategorizedCacheEntries,
} from "@/api/anilistCache";
import CacheCategorySection from "./components/cache/cacheCategorySection";
import SeriesMappingSummaryCard from "./components/cache/seriesMappingSummaryCard";
import { formatBytes } from "./components/cache/cacheFormatting";

const CLEAR_ALL_CONFIRM_TEXT = "CLEAR";
// Matches COLLECTION_CACHE_TTL_MS in anilistSearch.tsx, which writes these same
// genreCollection/tagCollection cache keys — refreshing from this page must not
// silently change how long the refreshed entry stays cached.
const COLLECTION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Matches ANILIST_CACHE_TTL in anilistProfile.tsx, which writes these same
// profile/list cache keys.
const PROFILE_LIST_CACHE_TTL_MS = 10 * 60 * 1000;

const CacheTab: React.FC = () => {
  const toast = useToast();
  const client = useApolloClient();
  const [categories, setCategories] = useState<AniListCacheCategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen: isClearAllOpen, onOpen: openClearAll, onClose: closeClearAllBase } = useDisclosure();
  const [clearAllConfirmText, setClearAllConfirmText] = useState("");
  const [isClearingAll, setIsClearingAll] = useState(false);

  const { refetch: refetchProfile } = useGetMeQuery({ skip: true });

  const closeClearAll = useCallback(() => {
    setClearAllConfirmText("");
    closeClearAllBase();
  }, [closeClearAllBase]);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      setCategories(await getCategorizedCacheEntries());
    } catch (error) {
      toast({ title: "Failed to load cache", status: "error", duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleDelete = useCallback(
    async (key: string) => {
      try {
        await deleteCacheEntry(key);
        await loadCategories();
        toast({ title: "Cache entry deleted", status: "success", duration: 2000 });
      } catch (error) {
        toast({ title: "Failed to delete cache entry", status: "error", duration: 5000 });
      }
    },
    [loadCategories, toast]
  );

  const handleClearCategory = useCallback(
    async (category: AniListCacheCategory) => {
      try {
        await clearCacheCategory(category);
        await loadCategories();
        toast({ title: "Category cleared", status: "success", duration: 2000 });
      } catch (error) {
        toast({ title: "Failed to clear category", status: "error", duration: 5000 });
      }
    },
    [loadCategories, toast]
  );

  const handleClearAll = useCallback(async () => {
    setIsClearingAll(true);
    try {
      await clearAllCache();
      await loadCategories();
      toast({ title: "All cache cleared", status: "success", duration: 2000 });
      closeClearAll();
    } catch (error) {
      toast({ title: "Failed to clear cache", status: "error", duration: 5000 });
    } finally {
      setIsClearingAll(false);
    }
  }, [loadCategories, toast, closeClearAll]);

  const handleRefreshProfile = useCallback(async () => {
    try {
      const { data } = await refetchProfile();
      if (data?.Viewer) {
        await db.setAniListCache("profile", data.Viewer, PROFILE_LIST_CACHE_TTL_MS);
      }
      await loadCategories();
      toast({ title: "Profile refreshed", status: "success", duration: 2000 });
    } catch (error) {
      toast({ title: "Failed to refresh profile", status: "error", duration: 5000 });
    }
  }, [refetchProfile, loadCategories, toast]);

  const handleRefreshList = useCallback(
    async (key: string) => {
      const [, userIdRaw, status] = key.split(":");
      const userId = Number(userIdRaw);
      if (!userId || !status) return;
      try {
        const res = await client.query({
          query: GET_USER_ANIME_LIST,
          variables: { userId, status: status as MediaListStatus },
          fetchPolicy: "network-only",
        });
        await db.setAniListCache(key, res.data, PROFILE_LIST_CACHE_TTL_MS);
        await loadCategories();
        toast({ title: "List refreshed", status: "success", duration: 2000 });
      } catch (error) {
        toast({ title: "Failed to refresh list", status: "error", duration: 5000 });
      }
    },
    [client, loadCategories, toast]
  );

  const handleRefreshCollection = useCallback(
    async (key: string) => {
      try {
        if (key === "genreCollection") {
          const res = await client.query({ query: GET_GENRE_COLLECTION, fetchPolicy: "network-only" });
          const genres = (res.data?.GenreCollection ?? []).filter((genre: string | null): genre is string => !!genre);
          await db.setAniListCache(key, genres, COLLECTION_CACHE_TTL_MS);
        } else if (key === "tagCollection") {
          const res = await client.query({ query: GET_MEDIA_TAG_COLLECTION, fetchPolicy: "network-only" });
          const tags: Array<{ name: string; isAdult?: boolean | null }> = res.data?.MediaTagCollection ?? [];
          await db.setAniListCache(
            key,
            tags.map((tag) => ({ value: tag.name, label: tag.name, isAdult: !!tag.isAdult })),
            COLLECTION_CACHE_TTL_MS
          );
        }
        await loadCategories();
        toast({ title: "Collection refreshed", status: "success", duration: 2000 });
      } catch (error) {
        toast({ title: "Failed to refresh collection", status: "error", duration: 5000 });
      }
    },
    [client, loadCategories, toast]
  );

  const refreshHandlers: Partial<Record<AniListCacheCategory, (key: string) => Promise<void>>> = {
    profile: handleRefreshProfile,
    lists: handleRefreshList,
    collections: handleRefreshCollection,
  };

  const totalSizeBytes = useMemo(() => categories.reduce((sum, category) => sum + category.totalSizeBytes, 0), [categories]);
  const totalEntries = useMemo(() => categories.reduce((sum, category) => sum + category.entries.length, 0), [categories]);

  return (
    <>
      <Modal isOpen={isClearAllOpen} onClose={closeClearAll}>
        <ModalOverlay />
        <ModalContent bg="bg.primary" color="text.primary">
          <ModalHeader color="accent.primary">Clear all cache?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text>This deletes every cached AniList profile, list, collection, and search result. Nothing else is affected.</Text>
              <Text fontSize="sm" color="text.secondary">
                Type {CLEAR_ALL_CONFIRM_TEXT} to confirm.
              </Text>
              <Input
                value={clearAllConfirmText}
                onChange={(event) => setClearAllConfirmText(event.target.value)}
                data-testid="clear-all-confirm-input"
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeClearAll}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleClearAll}
              isLoading={isClearingAll}
              isDisabled={clearAllConfirmText !== CLEAR_ALL_CONFIRM_TEXT}
              data-testid="confirm-clear-all-button"
            >
              Clear all
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <VStack spacing={4} align="stretch" mb={4}>
        <Heading size="lg" color="accent.primary">
          Cache
        </Heading>
        <Text color="text.secondary" fontSize="sm">
          Everything Kita has cached from AniList: what&apos;s stored, how old it is, and when it expires. View, refresh, or delete any of
          it.
        </Text>
        <Box bg="bg.secondary" border="1px solid" borderColor="border.primary" borderRadius="xl" p={4}>
          <HStack justify="space-between" align="center">
            <Stat>
              <StatLabel color="text.secondary">Total cached entries</StatLabel>
              <StatNumber color="text.primary">{totalEntries}</StatNumber>
            </Stat>
            <Stat textAlign="right">
              <StatLabel color="text.secondary">Estimated size</StatLabel>
              <StatNumber color="text.primary">{formatBytes(totalSizeBytes)}</StatNumber>
            </Stat>
            <Button
              colorScheme="red"
              variant="outline"
              onClick={openClearAll}
              isDisabled={totalEntries === 0}
              data-testid="open-clear-all-button"
            >
              Clear all cache
            </Button>
          </HStack>
        </Box>
      </VStack>

      <VStack spacing={4} align="stretch">
        {categories.map((category) => (
          <CacheCategorySection
            key={category.category}
            summary={category}
            isLoading={isLoading}
            onDelete={handleDelete}
            onClearCategory={handleClearCategory}
            onRefresh={refreshHandlers[category.category]}
          />
        ))}
        <Divider />
        <SeriesMappingSummaryCard />
      </VStack>
    </>
  );
};

export default CacheTab;
