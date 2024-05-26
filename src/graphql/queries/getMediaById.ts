import { gql } from "@apollo/client";

export const GET_MEDIA_BY_ID = gql`
  query GetMediaById($mediaId: Int) {
    Media(id: $mediaId) {
      id
      idMal
      season
      seasonYear
      title {
        english
        native
      }
      coverImage {
        extraLarge
      }
      bannerImage
      type
      status(version: 2)
      episodes
      chapters
      volumes
      isFavourite
      mediaListEntry {
        id
        mediaId
        status
        score
        advancedScores
        progress
        progressVolumes
        repeat
        priority
        private
        hiddenFromStatusLists
        customLists
        notes
        updatedAt
        startedAt {
          year
          month
          day
        }
        completedAt {
          year
          month
          day
        }
        user {
          id
          name
        }
      }
    }
  }
`;
