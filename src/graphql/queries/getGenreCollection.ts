import { gql } from "@apollo/client";

export const GET_GENRE_COLLECTION = gql`
  query GetGenreCollection {
    GenreCollection
  }
`;
