import React, { useCallback, useEffect, useState } from "react";
import { Badge, Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { getPendingAnilistSyncs, refreshAnilistPendingBadge, removePendingAnilistSync } from "@/api/integration/anilistPendingSync";
import { seriesMappingStorage } from "@/api/seriesMapping";
import { syncEpisodeToAnilist } from "@/api/integration/anilistEpisodeSync";
import IndexedDB from "@/db/index";
import { ISeriesMapping, ISeriesSearchResult, PendingAnilistSync } from "@/types/integrations/seriesMapping";
import { IVideo } from "@/types/video";
import { useToastContext } from "@/context/toastNotificationContext";
import { useAnilistContext } from "@/context/anilistContext";
import SeriesMappingSelection from "@/components/SeriesMappingSelection";

const PendingAnilistReview = () => {
  const { showToast } = useToastContext();
  const { anilistAuth } = useAnilistContext();
  const [pending, setPending] = useState<PendingAnilistSync[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const loadPending = useCallback(() => {
    getPendingAnilistSyncs().then(setPending);
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // Thin wrapper around the shared sync function (also used by auto-sync and search-and-link) -
  // see anilistEpisodeSync.ts for the actual progress resolution, push, and local writeback.
  const syncVideoToMapping = useCallback(
    async (video: IVideo, mapping: ISeriesMapping): Promise<void> => {
      await syncEpisodeToAnilist(video, mapping, anilistAuth.access_token);
    },
    [anilistAuth.access_token]
  );

  const handleSelect = useCallback(
    async (entry: PendingAnilistSync, result: ISeriesSearchResult) => {
      setIsResolving(true);
      try {
        const mapping = await seriesMappingStorage.createMapping({
          series_title: entry.series_title,
          source_platform: entry.source_platform,
          season_year: entry.season_year,
          anilist_series_id: result.id,
          mal_series_id: result.idMal,
          total_episodes: result.episodes,
          cover_image: result.coverImage?.large || result.coverImage?.extraLarge,
          background_cover_image: result.coverImage?.extraLarge,
          banner_image: result.bannerImage,
          series_description: result.description,
          user_confirmed: true,
        });

        // Resolving one episode also catches up any other already-captured
        // episodes of the same series that were skipped while this sat pending -
        // otherwise every one of them would need to be resolved by hand too. Sorted into watch
        // order so, if AniList had no progress yet, the first push seeds it sensibly; each push
        // after that reads back its own just-updated cache, so the backlog naturally advances in
        // sequence without this loop needing to thread anything through itself.
        const allVideos = await IndexedDB.getAllVideos();
        const matchingVideos = allVideos
          .filter(
            (video) =>
              video.series_title === entry.series_title && video.watching_season_year === entry.season_year && !video.anilist_series_id
          )
          .sort((a, b) => a.created_at - b.created_at);

        for (const video of matchingVideos) {
          await syncVideoToMapping(video, mapping);
        }

        await removePendingAnilistSync(entry.id);
        await refreshAnilistPendingBadge();
        loadPending();

        showToast({
          title: "Series mapping saved!",
          description: `${entry.series_title} synced (${matchingVideos.length} episode${matchingVideos.length === 1 ? "" : "s"}).`,
          status: "success",
          duration: 4000,
        });
      } catch (error) {
        showToast({ title: "Failed to sync to AniList", status: "error" });
      } finally {
        setActiveEntryId(null);
        setIsResolving(false);
      }
    },
    [loadPending, showToast, syncVideoToMapping]
  );

  if (pending.length === 0) {
    return null;
  }

  const activeEntry = pending.find((entry) => entry.id === activeEntryId);

  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} p={4} bg="bg.secondary" border="1px solid" borderColor="border.primary">
      <Flex flexDirection={"column"} gap={4}>
        <Heading as="h2" fontWeight={"bold"} fontSize={"large"} color="text.primary">
          Pending Review
        </Heading>
        <Text color="text.secondary" fontSize="sm">
          These were captured but AniList found more than one possible match - pick the right one to finish syncing.
        </Text>

        <VStack align="stretch" spacing={2}>
          {pending.map((entry) => (
            <Flex
              key={entry.id}
              justifyContent={"space-between"}
              alignItems={"center"}
              bg="bg.tertiary"
              rounded="lg"
              p={3}
              border="1px solid"
              borderColor="border.primary"
            >
              <Flex alignItems={"center"} gap={2}>
                <Text color="text.primary">{entry.series_title}</Text>
                <Badge colorScheme="orange">{entry.search_results.length} matches</Badge>
              </Flex>
              <Button size="sm" colorScheme="green" onClick={() => setActiveEntryId(entry.id)}>
                Resolve
              </Button>
            </Flex>
          ))}
        </VStack>
      </Flex>

      {activeEntry && (
        <SeriesMappingSelection
          isVisible={!!activeEntry}
          onSkip={() => setActiveEntryId(null)}
          onSelect={(result) => handleSelect(activeEntry, result)}
          searchResults={activeEntry.search_results}
          seriesTitle={activeEntry.series_title}
          isLoading={isResolving}
        />
      )}
    </Box>
  );
};

export default PendingAnilistReview;
