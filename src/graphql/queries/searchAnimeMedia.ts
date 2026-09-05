import { gql } from "@apollo/client";

export const SEARCH_ANIME_MEDIA = gql`
  query SearchAnimeMedia(
    $page: Int
    $search: String
    $genres: [String]
    $tags: [String]
    $seasonYear: Int
    $sort: [MediaSort]
    $isAdult: Boolean
    $formats: [MediaFormat]
  ) {
    Page(page: $page, perPage: 20) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      media(
        type: ANIME
        isAdult: $isAdult
        search: $search
        genre_in: $genres
        tag_in: $tags
        seasonYear: $seasonYear
        format_in: $formats
        sort: $sort
      ) {
        id
        title {
          userPreferred
        }
        coverImage {
          extraLarge
          large
        }
        seasonYear
        format
        episodes
        averageScore
        genres
        siteUrl
        mediaListEntry {
          id
          status
        }
      }
    }
  }
`;
