import LoadingState from "@/components/states/LoadingState";
import useFetch from "@/hooks/useFetch";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Avatar, Box, Flex, Heading, Link, Text } from "@chakra-ui/react";
import React, { useCallback } from "react";

type IMyAnimeListProfile = {
  authorized: boolean;
};

type AnimeStatistics = {
  num_items_watching: number;
  num_items_completed: number;
  num_items_on_hold: number;
  num_days: number;
  num_days_completed: number;
  num_days_dropped: number;
  num_days_on_hold: number;
  num_days_watched: number;
  num_days_watching: number;
  num_episodes: number;
  num_items: number;
  num_items_dropped: number;
  num_items_plan_to_watch: number;
  num_times_rewatched: number;
};

type MyAnimeListProfileData = {
  anime_statistics: AnimeStatistics;
  mean_score: number;
  id: number;
  joined_at: string;
  location: string;
  name: string;
  picture: string;
};

const MAL_PROFILE_PATH = "https://myanimelist.net/profile/";
const MAL_USER_PATH = "/mal/user/me";

const MyAnimeListProfile = ({ authorized }: IMyAnimeListProfile) => {
  const { data, loading, error } = useFetch<MyAnimeListProfileData>(MAL_USER_PATH, authorized);

  const profileUrl = useCallback((name: string) => {
    return `${MAL_PROFILE_PATH}${name}`;
  }, []);

  if (loading) return <LoadingState />;

  if (error) return <Text>Error loading MyAnimeList profile</Text>;

  return (
    <Flex p={4} flexDirection={"column"} gap={2}>
      <Flex gap={4} alignItems="center">
        <Avatar name={data?.name} src={data?.picture ?? ""} />

        <Box>
          <Heading size="sm">{data?.name}</Heading>
          <Link href={profileUrl(data?.name ?? "")} isExternal target={"_blank"}>
            Anilist profile <ExternalLinkIcon mx="2px" />
          </Link>
        </Box>
      </Flex>
      <Flex flexDirection={"column"} gap={2}>
        <Text as="span" fontWeight={"bold"}>
          Number Days: {data?.anime_statistics.num_days}
        </Text>
        <Text as="span" fontWeight={"bold"}>
          Number Episodes: {data?.anime_statistics.num_episodes}
        </Text>
        <Text as="span" fontWeight={"bold"}>
          Number Items: {data?.anime_statistics.num_items}
        </Text>
      </Flex>
    </Flex>
  );
};

export default MyAnimeListProfile;
