import { gql } from "@apollo/client";

export const GET_MEDIA_TAG_COLLECTION = gql`
  query GetMediaTagCollection {
    MediaTagCollection {
      id
      name
      category
      isAdult
    }
  }
`;
