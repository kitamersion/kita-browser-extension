import { gql } from "@apollo/client";

export const GET_MEDIA_BY_SEARCH = gql`
  query GetMediaBySearch($search: String) {
    Media(search: $search) {
      title {
        english
        native
      }
      coverImage {
        extraLarge
        large
        medium
        color
      }
      idMal
      id
      episodes
      seasonYear
      siteUrl
      bannerImage
    }
  }
`;
