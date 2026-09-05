import { Box, Button, Flex, HStack, Input, Select, SimpleGrid, Skeleton, Text, VStack } from "@chakra-ui/react";
import { useApolloClient } from "@apollo/client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MediaSort, useSearchAnimeMediaLazyQuery } from "@/graphql";
import { GET_GENRE_COLLECTION } from "@/graphql/queries/getGenreCollection";
import { GET_MEDIA_TAG_COLLECTION } from "@/graphql/queries/getMediaTagCollection";
import { useAnilistCollectionCache } from "@/hooks/useAnilistCollectionCache";
import AnilistMultiSelectFilter from "./anilistMultiSelectFilter";
import AnilistSearchResultCard from "./anilistSearchResultCard";

const SEARCH_DEBOUNCE_MS = 400;
const COLLECTION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RESULT_SKELETON_COUNT = 10;
const EARLIEST_YEAR = 1960;

const AnilistSearch: React.FC = () => {
  const client = useApolloClient();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);

  const [runSearch, { data, loading, error }] = useSearchAnimeMediaLazyQuery();

  const { data: genreData } = useAnilistCollectionCache<string[]>("genreCollection", COLLECTION_CACHE_TTL_MS, async () => {
    const res = await client.query({ query: GET_GENRE_COLLECTION, fetchPolicy: "network-only" });
    return (res.data?.GenreCollection ?? []).filter((genre: string | null): genre is string => !!genre);
  });

  const { data: tagData } = useAnilistCollectionCache<{ value: string; label: string }[]>(
    "tagCollection",
    COLLECTION_CACHE_TTL_MS,
    async () => {
      const res = await client.query({ query: GET_MEDIA_TAG_COLLECTION, fetchPolicy: "network-only" });
      const tags: Array<{ name: string; isAdult?: boolean | null }> = res.data?.MediaTagCollection ?? [];
      return tags.filter((tag) => !tag.isAdult).map((tag) => ({ value: tag.name, label: tag.name }));
    }
  );

  const genreOptions = useMemo(() => (genreData ?? []).map((genre) => ({ value: genre, label: genre })), [genreData]);
  const tagOptions = tagData ?? [];

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: currentYear - EARLIEST_YEAR + 1 }, (_, index) => currentYear - index),
    [currentYear]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Reset to page 1 during render (not in an effect) whenever the filters
  // change, so `variables` below is computed with the corrected page in the
  // same render pass. Resetting in a separate effect would leave `variables`
  // memoized against the stale `page` for one extra render, firing a wasted
  // query with the wrong page before the reset commits. See:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const filtersKey = JSON.stringify([debouncedSearch, selectedGenres, selectedTags, selectedYear]);
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    setPage(1);
  }

  const variables = useMemo(
    () => ({
      page,
      search: debouncedSearch || undefined,
      genres: selectedGenres.length > 0 ? selectedGenres : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      seasonYear: selectedYear,
      sort: debouncedSearch ? [MediaSort.SearchMatch] : [MediaSort.PopularityDesc],
    }),
    [page, debouncedSearch, selectedGenres, selectedTags, selectedYear]
  );

  useEffect(() => {
    runSearch({ variables });
    // runSearch is an Apollo-provided callback with a stable identity per query;
    // only the variables should re-trigger a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variables]);

  const resultsRef = useRef<HTMLDivElement>(null);

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    // jsdom does not implement Element.prototype.scrollIntoView (it's simply
    // undefined, not a stub), unlike real browsers. Guard the call so this
    // works in tests without needing a jsdom polyfill; behavior in the
    // browser is unaffected since scrollIntoView is always present there.
    if (typeof resultsRef.current?.scrollIntoView === "function") {
      resultsRef.current.scrollIntoView({ block: "start" });
    }
  };

  const hasActiveFilters = Boolean(debouncedSearch || selectedGenres.length || selectedTags.length || selectedYear);

  const clearFilters = () => {
    setSearchText("");
    setSelectedGenres([]);
    setSelectedTags([]);
    setSelectedYear(undefined);
  };

  const media = data?.Page?.media?.filter((item): item is NonNullable<typeof item> => !!item) ?? [];
  const pageInfo = data?.Page?.pageInfo;

  return (
    <VStack align="stretch" spacing={4}>
      <Input
        placeholder="Search anime..."
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        data-testid="anilist-search-input"
      />
      <Flex gap={2} wrap="wrap" align="center">
        <AnilistMultiSelectFilter label="Genres" options={genreOptions} selectedValues={selectedGenres} onChange={setSelectedGenres} />
        <AnilistMultiSelectFilter label="Tags" options={tagOptions} selectedValues={selectedTags} onChange={setSelectedTags} />
        <Select
          placeholder="Year"
          maxW="120px"
          size="sm"
          value={selectedYear ?? ""}
          onChange={(event) => setSelectedYear(event.target.value ? Number(event.target.value) : undefined)}
          data-testid="anilist-search-year-select"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters} data-testid="anilist-search-clear-filters">
            Clear filters
          </Button>
        )}
      </Flex>

      <Box ref={resultsRef} data-testid="anilist-search-results">
        {loading ? (
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
            {Array.from({ length: RESULT_SKELETON_COUNT }).map((_, index) => (
              <Skeleton key={index} height="280px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        ) : error ? (
          <VStack spacing={3} py={8}>
            <Text color="text.secondary">{error.message}</Text>
            <Button onClick={() => runSearch({ variables })} data-testid="anilist-search-retry">
              Retry
            </Button>
          </VStack>
        ) : media.length === 0 ? (
          <VStack spacing={3} py={8}>
            <Text color="text.secondary">No results found.</Text>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </VStack>
        ) : (
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
            {media.map((item) => (
              <AnilistSearchResultCard key={item.id} media={item} />
            ))}
          </SimpleGrid>
        )}
      </Box>

      {pageInfo && media.length > 0 && (
        <HStack justify="center" spacing={4}>
          <Button size="sm" onClick={() => goToPage(page - 1)} isDisabled={page <= 1} data-testid="anilist-search-prev-page">
            Prev
          </Button>
          <Text fontSize="sm" color="text.secondary">
            Page {pageInfo.currentPage} of {pageInfo.lastPage}
          </Text>
          <Button size="sm" onClick={() => goToPage(page + 1)} isDisabled={!pageInfo.hasNextPage} data-testid="anilist-search-next-page">
            Next
          </Button>
        </HStack>
      )}
    </VStack>
  );
};

export default AnilistSearch;
