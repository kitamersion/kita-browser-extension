import React from "react";
import { SearchIcon, SettingsIcon } from "@chakra-ui/icons";
import { MdExtension, MdSync, MdCompareArrows, MdArticle, MdVideoLibrary } from "react-icons/md";
import { IoIosPricetags } from "react-icons/io";
import { SiAnilist } from "react-icons/si";
import { AuthStatus } from "@/types/kitaschema";

const IntegrationTab = React.lazy(() => import("@/pages/settings/tabs/integrationTab"));
const AutoTrackTab = React.lazy(() => import("@/pages/settings/tabs/autoTrackTab"));
const AnilistTab = React.lazy(() => import("@/pages/settings/tabs/anilistTab"));
const AnilistSearchTab = React.lazy(() => import("@/pages/settings/tabs/anilistSearchTab"));
const TagTab = React.lazy(() => import("@/pages/settings/tabs/tagsTab"));
const SeriesMappingsTab = React.lazy(() => import("@/pages/settings/tabs/seriesMappingsTab"));
const GeneralTab = React.lazy(() => import("@/pages/settings/tabs/generalTab"));
const SavedVideosTab = React.lazy(() => import("@/pages/settings/tabs/savedVideosTab"));
const LogsTab = React.lazy(() => import("@/pages/settings/tabs/logsTab"));

export type SettingsNavContext = {
  anilistAuthStatus: AuthStatus;
};

export type SettingsNavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType;
  condition?: (ctx: SettingsNavContext) => boolean;
};

export type SettingsNavGroup = {
  id: string;
  label: string;
  items: SettingsNavItem[];
};

export const SETTINGS_GROUPS: SettingsNavGroup[] = [
  {
    id: "track",
    label: "Track",
    items: [
      { id: "integration", label: "Integrations", icon: MdExtension, component: IntegrationTab },
      { id: "autotrack", label: "Auto Track", icon: MdSync, component: AutoTrackTab },
      {
        id: "anilist",
        label: "AniList Profile",
        icon: SiAnilist,
        component: AnilistTab,
        condition: (ctx) => ctx.anilistAuthStatus === "authorized",
      },
      {
        id: "anilist-search",
        label: "AniList Search",
        icon: SearchIcon,
        component: AnilistSearchTab,
        condition: (ctx) => ctx.anilistAuthStatus === "authorized",
      },
    ],
  },
  {
    id: "organize",
    label: "Organize",
    items: [
      { id: "tags", label: "Tags", icon: IoIosPricetags, component: TagTab },
      { id: "mappings", label: "Series Mappings", icon: MdCompareArrows, component: SeriesMappingsTab },
    ],
  },
  {
    id: "data",
    label: "Data",
    items: [
      { id: "general", label: "Backup & Restore", icon: SettingsIcon, component: GeneralTab },
      { id: "saved-videos", label: "Saved Videos", icon: MdVideoLibrary, component: SavedVideosTab },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    items: [{ id: "logs", label: "Logs", icon: MdArticle, component: LogsTab }],
  },
];

export const getVisibleItems = (groups: SettingsNavGroup[], ctx: SettingsNavContext): SettingsNavItem[] =>
  groups.flatMap((group) => group.items.filter((item) => !item.condition || item.condition(ctx)));
