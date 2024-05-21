import LoadingState from "@/components/states/LoadingState";
import { useGetMediaBySearchLazyQuery } from "@/graphql";
import { IconButton } from "@chakra-ui/react";
import React, { useEffect } from "react";
import { SiAnilist } from "react-icons/si";

type IAnilistAnimeTrySearchAndLink = {
  video_title: string;
};

const AnilistAnimeTrySearchAndLink = ({ video_title }: IAnilistAnimeTrySearchAndLink) => {
  const [getMediaBySearch, { data, loading, error }] = useGetMediaBySearchLazyQuery();

  const searchInAnilist = () => {
    getMediaBySearch({ variables: { search: video_title } });
  };

  useEffect(() => {
    if (data) {
      console.log(data);
    }
  }, [data]);

  if (loading) {
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
