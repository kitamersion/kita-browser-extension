import { gql } from "@apollo/client";

export const GET_ME = gql`
  query GetMe {
    Viewer {
      id
      name
      siteUrl
      avatar {
        medium
      }
      statistics {
        anime {
          count
          minutesWatched
        }

        manga {
          count
          chaptersRead
        }
      }
    }
  }
`;
