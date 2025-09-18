import { gql } from "@apollo/client";

export const GET_USER_ANIME_LIST = gql`
  query GetUserAnimeList($status: MediaListStatus, $userId: Int) {
    MediaListCollection(userId: $userId, type: ANIME, status: $status, sort: [UPDATED_TIME_DESC]) {
      lists {
        name
        status
        entries {
          id
          mediaId
          status
          progress
          progressVolumes
          score
          repeat
          priority
          private
          notes
          hiddenFromStatusLists
          customLists
          advancedScores
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
          updatedAt
          createdAt
          media {
            id
            title {
              romaji
              english
              native
              userPreferred
            }
            coverImage {
              extraLarge
              large
              medium
              color
            }
            bannerImage
            format
            status
            episodes
            duration
            chapters
            volumes
            genres
            averageScore
            popularity
            favourites
            studios {
              edges {
                node {
                  id
                  name
                }
                isMain
              }
            }
            nextAiringEpisode {
              id
              timeUntilAiring
              episode
            }
            siteUrl
          }
        }
      }
    }
  }
`;
