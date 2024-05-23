import LoadingState from "@/components/states/LoadingState";
import { useGetMediaBySearchLazyQuery, useSetMediaListEntryByAnilistIdMutation } from "@/graphql";
import { IconButton } from "@chakra-ui/react";
import React, { useEffect } from "react";
import { SiAnilist } from "react-icons/si";
import eventbus from "@/api/eventbus";
import { IVideo } from "@/types/video";
import { VIDEO_UPDATED_BY_ID } from "@/data/events";
import { useToastContext } from "@/context/toastNotificationContext";

const AnilistAnimeTrySearchAndLink = (video: IVideo) => {
  const { showToast } = useToastContext();
  const [getMediaBySearch, { data: searchData, loading: searchLoading, error: searchError }] = useGetMediaBySearchLazyQuery();
  const [setMedia, { data: mediaSetData, loading: mediaSetLoading, error: mediaSetError }] = useSetMediaListEntryByAnilistIdMutation();

  const searchInAnilist = () => {
    getMediaBySearch({ variables: { search: video.series_title ?? video.video_title } });
  };

  useEffect(() => {
    if (searchData) {
      const updatedVideo: IVideo = {
        ...video,
        anilist_series_id: searchData.Media?.id,
        mal_series_id: searchData.Media?.idMal ?? undefined,
        series_episode_number: searchData.Media?.episodes ?? undefined,
        series_season_year: searchData.Media?.seasonYear ?? undefined,
        background_cover_image: searchData.Media?.coverImage?.extraLarge ?? undefined,
        banner_image: searchData.Media?.bannerImage ?? undefined,
        updated_at: Date.now(),
      };

      eventbus.publish(VIDEO_UPDATED_BY_ID, { message: "updating video with anilist search", value: updatedVideo });

      if (searchData.Media?.id) {
        setMedia({ variables: { id: searchData.Media.id, progress: video.watching_episode_number } });

        console.log(mediaSetData);
        showToast({
          title: "Anilist media item synced! 🔄",
          status: "success",
        });
      }
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
  }, [mediaSetData, mediaSetError, searchData, searchError, setMedia, showToast, video]);

  if (searchLoading || mediaSetLoading) {
    return <LoadingState />;
  }

  return (
    <IconButton
      icon={<SiAnilist />}
      aria-label="Search in Anilist"
      variant="ghost"
      rounded="full"
      title="Search in Anilist"
      onClick={searchInAnilist}
    />
  );
};

export default AnilistAnimeTrySearchAndLink;
