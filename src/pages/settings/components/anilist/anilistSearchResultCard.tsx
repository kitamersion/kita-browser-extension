import { Badge, Box, HStack, Heading, Image, Link, VStack } from "@chakra-ui/react";
import React from "react";
import AnilistSearchStatusMenu from "./anilistSearchStatusMenu";
import { AnilistSearchMediaResult } from "./anilistSearchTypes";

export type AnilistSearchResultCardProps = {
  media: AnilistSearchMediaResult;
};

const AnilistSearchResultCard: React.FC<AnilistSearchResultCardProps> = ({ media }) => {
  const title = media.title?.userPreferred ?? "Untitled";
  const coverImage = media.coverImage?.extraLarge ?? media.coverImage?.large ?? "";
  const siteUrl = media.siteUrl ?? "#";

  return (
    <Box variant="card" as="article" overflow="hidden" data-testid={`anilist-search-result-${media.id}`} {...({} as any)}>
      <Link href={siteUrl} isExternal target="_blank">
        <Image src={coverImage} alt={title} objectFit="cover" w="full" h="220px" />
      </Link>
      <VStack align="stretch" spacing={2} p={3}>
        <Link href={siteUrl} isExternal target="_blank">
          <Heading size="xs" noOfLines={2} color="text.primary">
            {title}
          </Heading>
        </Link>
        <HStack spacing={2} wrap="wrap">
          {media.format && <Badge>{media.format}</Badge>}
          {media.seasonYear && <Badge>{media.seasonYear}</Badge>}
          {typeof media.averageScore === "number" && <Badge colorScheme="orange">{media.averageScore}%</Badge>}
        </HStack>
        <AnilistSearchStatusMenu mediaId={media.id} initialStatus={media.mediaListEntry?.status ?? null} />
      </VStack>
    </Box>
  );
};

export default AnilistSearchResultCard;
