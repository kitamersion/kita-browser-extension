// VIDEO_EVENTS
export const VIDEO_ADD = "VIDEO_ADD";
export const VIDEO_REFRESH = "VIDEO_REFRESH";
export const VIDEO_DELETE_ALL = "VIDEO_DELETE_ALL";
export const VIDEO_DELETED_BY_ID = "VIDEO_DELETED_BY_ID";
export const VIDEO_UPDATED_BY_ID = "VIDEO_UPDATED_BY_ID";

// TAG_EVENTS
export const TAG_SET = "TAG_SET";
export const TAG_DELETE_ALL = "TAG_DELETE_ALL";
export const TAG_DELETE_BY_ID = "TAG_DELETE_BY_ID";

// TAG_VIDEO_EVENTS
export const CASCADE_REMOVE_TAG_FROM_VIDEO_BY_TAG_ID = "CASCADE_REMOVE_TAG_FROM_VIDEO_BY_TAG_ID";
export const CASCADE_REMOVE_TAGS_FROM_VIDEOS = "CASCADE_REMOVE_TAGS_FROM_VIDEOS";
export const VIDEO_TAG_ADD_RELATIONSHIP = "VIDEO_TAG_ADD_RELATIONSHIP";
export const VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID = "VIDEO_TAG_REMOVE_RELATIONSHIP_BY_TAG_ID";
export const VIDEO_TAG_REMOVE_RELATIONSHIP_BY_VIDEO_ID = "VIDEO_TAG_REMOVE_RELATIONSHIP_BY_VIDEO_ID";

// AUTO_TAG_EVENTS
export const AUTO_TAG_ADD_OR_UPDATE = "AUTO_TAG_ADD_OR_UPDATE";
export const AUTO_TAG_DELETE_BY_ID = "AUTO_TAG_DELETE_BY_ID";

// APPLICATION_EVENTS
export const APPLICATION_ENABLE = "APPLICATION_ENABLE";
export const CONTENT_SCRIPT_ENABLE = "CONTENT_SCRIPT_ENABLE";

// SETTINGS_EVENTS
export const SETTINGS_DATA_IMPORT_SUCCESS = "SETTINGS_DATA_IMPORT_SUCCESS";
export const SETTINGS_DATA_IMPORT_ERROR = "SETTINGS_DATA_IMPORT_ERROR";

// INTEGRATION_EVENTS
export const INTEGRATION_ANILIST_AUTH_CONNECT = "INTEGRATION_ANILIST_AUTH_CONNECT"; // background service worker
export const INTEGRATION_ANILIST_AUTH_DISCONNECT = "INTEGRATION_ANILIST_AUTH_DISCONNECT";
export const INTEGRATION_ANILIST_AUTH_START = "INTEGRATION_ANILIST_AUTH_START";
export const INTEGRATION_ANILIST_AUTH_POLL = "INTEGRATION_ANILIST_AUTH_POLL";
export const INTEGRATION_ANILIST_CONFIG_UPDATE = "INTEGRATION_ANILIST_CONFIG_UPDATE";
