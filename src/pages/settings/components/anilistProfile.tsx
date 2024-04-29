import { GetMeQuery } from "@/graphql";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Avatar, Box, Flex, Heading, Link, Text } from "@chakra-ui/react";
import React, { useMemo } from "react";

const AnilistProfile = ({ Viewer }: GetMeQuery) => {
  const daysWatched = useMemo(() => {
    return Viewer?.statistics?.anime?.minutesWatched ? (Viewer?.statistics?.anime?.minutesWatched / 1440).toFixed(2) : "0.00";
  }, [Viewer?.statistics?.anime?.minutesWatched]);

  return (
    <Flex p={4} flexDirection={"column"} gap={2}>
      <Flex gap={4} alignItems="center">
        <Avatar name={Viewer?.name} src={Viewer?.avatar?.medium ?? ""} />

        <Box>
          <Heading size="sm">{Viewer?.name}</Heading>
          <Link href={Viewer?.siteUrl ?? "#"} isExternal target={"_blank"}>
            Anilist profile <ExternalLinkIcon mx="2px" />
          </Link>
        </Box>
      </Flex>
      <Flex flexDirection={"column"} gap={2}>
        <Text as="span" fontWeight={"bold"}>
          Anime: {Viewer?.statistics?.anime?.count}
        </Text>
        <Text as="span" fontWeight={"bold"}>
          Watched: {daysWatched} Days
        </Text>

        <Text as="span" fontWeight={"bold"}>
          Manga: {Viewer?.statistics?.manga?.count}
        </Text>
        <Text as="span" fontWeight={"bold"}>
          Chapters Read: {Viewer?.statistics?.manga?.chaptersRead}
        </Text>
      </Flex>
    </Flex>
  );
};

export default AnilistProfile;
