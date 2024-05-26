import { gql } from "@apollo/client";

export const SET_MEDIA_LIST_ENTRY_BY_ANILIST_ID = gql`
  mutation SetMediaListEntryByAnilistId($id: Int, $mediaId: Int, $progress: Int, $status: MediaListStatus) {
    SaveMediaListEntry(id: $id, mediaId: $mediaId, progress: $progress, status: $status) {
      id
      progress
      userId
      status
    }
  }
`;
