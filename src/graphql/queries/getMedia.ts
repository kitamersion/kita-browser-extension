import { gql } from "@apollo/client";

export const GET_MEDIA_BY_ID = gql`
  query GetMediaById($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
    }
  }
`;
