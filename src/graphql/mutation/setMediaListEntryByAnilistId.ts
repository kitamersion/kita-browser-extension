import { gql } from "@apollo/client";

export const SET_MEDIA_LIST_ENTRY_BY_ANILIST_ID = gql`
  mutation SetMediaListEntryByAnilistId($id: Int, $progress: Int) {
    SaveMediaListEntry(id: $id, progress: $progress) {
      id
      progress
      userId
    }
  }
`;
