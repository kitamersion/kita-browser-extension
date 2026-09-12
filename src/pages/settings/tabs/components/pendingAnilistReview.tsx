import React, { useCallback, useEffect, useState } from "react";
import { Badge, Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { MediaListStatus, useGetMediaByIdLazyQuery, useSetMediaListEntryByAnilistIdMutation } from "@/graphql";
import { getPendingAnilistSyncs, refreshAnilistPendingBadge, removePendingAnilistSync } from "@/api/integration/anilistPendingSync";
import { seriesMappingStorage } from "@/api/seriesMapping";
import IndexedDB from "@/db/index";
import { ISeriesMapping, ISeriesSearchResult, PendingAnilistSync } from "@/types/integrations/seriesMapping";
import { IVideo } from "@/types/video";
import { useToastContext } from "@/context/toastNotificationContext";
import { resolveAnilistProgress } from "@/utils";
import SeriesMappingSelection from "@/components/SeriesMappingSelection";

const PendingAnilistReview = () => {
  const { showToast } = useToastContext();
  const [pending, setPending] = useState<PendingAnilistSync[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [getMediaById] = useGetMediaByIdLazyQuery();
  const [setMedia] = useSetMediaListEntryByAnilistIdMutation();

  const loadPending = useCallback(() => {
    getPendingAnilistSyncs().then(setPending);
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // `knownProgress` is threaded through by the caller rather than re-queried here, since resolving
  // a whole backlog of pending episodes for one series (handleSelect below) pushes them one at a
  // time - each one needs to build on the progress the previous one just set, not on a stale read
  // of AniList from before this batch started. Returns the progress it resolved so the caller can
  // pass it into the next call. See resolveAnilistProgress for why "behind AniList" isn't a rewatch.
  const syncVideoToMapping = useCallback(
    async (video: IVideo, mapping: ISeriesMapping, knownProgress: number | null): Promise<number | null> => {
      if (!mapping.anilist_series_id || !video.watching_episode_number) return knownProgress;

      const progress = resolveAnilistProgress(video.watching_episode_number, knownProgress, mapping.total_episodes);
      const status = progress === mapping.total_episodes ? MediaListStatus.Completed : MediaListStatus.Current;

      await setMedia({
        variables: {
          mediaId: mapping.anilist_series_id,
          status,
          progress,
        },
      });

      const tag = await IndexedDB.getTagByCode("ANILIST");
      await IndexedDB.updateVideoById({
        ...video,
        watching_episode_number: progress,
        anilist_series_id: mapping.anilist_series_id,
        mal_series_id: mapping.mal_series_id,
        series_episode_number: mapping.total_episodes,
        series_season_year: mapping.season_year,
        background_cover_image: mapping.background_cover_image || video.background_cover_image,
        banner_image: mapping.banner_image || video.banner_image,
        updated_at: Date.now(),
        tags: tag?.id ? [tag.id] : video.tags,
      });
      if (tag?.id) {
        await IndexedDB.addVideoTag({ id: self.crypto.randomUUID(), video_id: video.id, tag_id: tag.id, created_at: Date.now() });
      }

      return progress;
    },
    [setMedia]
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
        // otherwise every one of them would need to be resolved by hand too.
        const allVideos = await IndexedDB.getAllVideos();
        const matchingVideos = allVideos
          .filter(
            (video) =>
              video.series_title === entry.series_title && video.watching_season_year === entry.season_year && !video.anilist_series_id
          )
          .sort((a, b) => a.created_at - b.created_at);

        // Read AniList's progress once up front, then thread the running value through the whole
        // backlog in watch order - each entry needs to build on the one just pushed, not a stale
        // read of AniList from before this batch started.
        const { data: mediaData } = await getMediaById({ variables: { mediaId: result.id } });
        let knownProgress = mediaData?.Media?.mediaListEntry?.progress ?? null;
        for (const video of matchingVideos) {
          knownProgress = await syncVideoToMapping(video, mapping, knownProgress);
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
    [loadPending, showToast, syncVideoToMapping, getMediaById]
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
