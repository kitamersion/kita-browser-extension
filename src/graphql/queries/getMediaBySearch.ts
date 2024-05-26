import { gql } from "@apollo/client";

export const GET_MEDIA_BY_SEARCH = gql`
  query GetMediaBySearch($search: String, $isAdult: Boolean) {
    anime: Page(perPage: 10) {
      pageInfo {
        total
      }
      results: media(type: ANIME, isAdult: $isAdult, search: $search) {
        id
        idMal
        episodes
        seasonYear
        siteUrl
        title {
          english
          native
        }
        coverImage {
          extraLarge
        }
        type
        format
        bannerImage
        isLicensed
      }
    }
  }
`;
