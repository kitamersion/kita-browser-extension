import LoadingState from "@/components/states/LoadingState";
import { GetMediaBySearchQuery, MediaListStatus, useGetMediaBySearchLazyQuery, useSetMediaListEntryByAnilistIdMutation } from "@/graphql";
import { IconButton } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { SiAnilist } from "react-icons/si";
import eventbus from "@/api/eventbus";
import { IVideo } from "@/types/video";
import { VIDEO_TAG_ADD_RELATIONSHIP, VIDEO_UPDATED_BY_ID } from "@/data/events";
import { useToastContext } from "@/context/toastNotificationContext";
import IndexedDB from "@/db/index";
import { IVideoTag } from "@/types/relationship";

const AnilistAnimeTrySearchAndLink = (video: IVideo) => {
  const { showToast } = useToastContext();
  const [getMediaBySearch, { data: searchData, loading: searchLoading, error: searchError }] = useGetMediaBySearchLazyQuery();
  const [setMedia, { data: mediaSetData, loading: mediaSetLoading, error: mediaSetError }] = useSetMediaListEntryByAnilistIdMutation();
  const [synced, setSynced] = useState(video.anilist_series_id ? true : false);

  const searchInAnilist = () => {
    getMediaBySearch({ variables: { search: video.series_title ?? video.video_title } });
  };

  useEffect(() => {
    const fetchAndSyncAnilist = async (searchData: GetMediaBySearchQuery) => {
      const tag = await IndexedDB.getTagByCode("ANILIST");

      const updatedVideo: IVideo = {
        ...video,
        anilist_series_id: searchData.Media?.id,
        mal_series_id: searchData.Media?.idMal ?? undefined,
        series_episode_number: searchData.Media?.episodes ?? undefined,
        series_season_year: searchData.Media?.seasonYear ?? undefined,
        background_cover_image: searchData.Media?.coverImage?.extraLarge ?? undefined,
        banner_image: searchData.Media?.bannerImage ?? undefined,
        updated_at: Date.now(),
        tags: tag?.id ? [tag.id] : [],
      };

      const videoTagRelationship: IVideoTag = {
        id: self.crypto.randomUUID(),
        video_id: video.id,
        tag_id: tag?.id ?? "",
        created_at: Date.now(),
      };

      eventbus.publish(VIDEO_UPDATED_BY_ID, { message: "updating video with anilist search", value: updatedVideo });
      eventbus.publish(VIDEO_TAG_ADD_RELATIONSHIP, { message: "video tag add relationship from anilist", value: [videoTagRelationship] });

      if (searchData.Media?.id) {
        const medaiCompletedStatus =
          video.watching_episode_number === video.series_episode_number ? MediaListStatus.Completed : MediaListStatus.Current;

        setMedia({ variables: { mediaId: searchData.Media.id, progress: video.watching_episode_number, status: medaiCompletedStatus } });

        showToast({
          title: "Anilist media synced!",
          status: "success",
        });
      }

      setSynced(true);
    };

    if (searchData && !synced) {
      fetchAndSyncAnilist(searchData);
    }

    if (searchError) {
      showToast({
        title: "Failed to search series in Anilist",
        description: "Please make sure Anilist integration is enabled. More information in settings page.",
        status: "error",
      });
    }

    if (mediaSetError) {
      showToast({
        title: "Failed to sync media to Anilist",
        status: "error",
      });
    }
  }, [mediaSetError, searchData, searchError, setMedia, showToast, synced, video]);

  if (searchLoading || mediaSetLoading) {
    return <LoadingState />;
  }

  return (
    <IconButton
      icon={<SiAnilist />}
      aria-label="Sync to Anilist"
      variant="ghost"
      rounded="full"
      title="Search in Anilist"
      onClick={searchInAnilist}
    />
  );
};

export default AnilistAnimeTrySearchAndLink;
