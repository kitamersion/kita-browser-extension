import React from "react";
import { AuthStatus } from "@/types/kitaschema";

const IntegrationTab = React.lazy(() => import("@/pages/settings/tabs/integrationTab"));
const AutoTrackTab = React.lazy(() => import("@/pages/settings/tabs/autoTrackTab"));
const AnilistTab = React.lazy(() => import("@/pages/settings/tabs/anilistTab"));
const TagTab = React.lazy(() => import("@/pages/settings/tabs/tagsTab"));
const SeriesMappingsTab = React.lazy(() => import("@/pages/settings/tabs/seriesMappingsTab"));
const GeneralTab = React.lazy(() => import("@/pages/settings/tabs/generalTab"));
const LogsTab = React.lazy(() => import("@/pages/settings/tabs/logsTab"));

export type SettingsNavContext = {
  anilistAuthStatus: AuthStatus;
};

export type SettingsNavItem = {
  id: string;
  label: string;
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
      { id: "integration", label: "Integrations", component: IntegrationTab },
      { id: "autotrack", label: "Auto Track", component: AutoTrackTab },
      {
        id: "anilist",
        label: "AniList Profile",
        component: AnilistTab,
        condition: (ctx) => ctx.anilistAuthStatus === "authorized",
      },
    ],
  },
  {
    id: "organize",
    label: "Organize",
    items: [
      { id: "tags", label: "Tags", component: TagTab },
      { id: "mappings", label: "Series Mappings", component: SeriesMappingsTab },
    ],
  },
  {
    id: "data",
    label: "Data",
    items: [{ id: "general", label: "General", component: GeneralTab }],
  },
  {
    id: "advanced",
    label: "Advanced",
    items: [{ id: "logs", label: "Logs", component: LogsTab }],
  },
];

export const getVisibleItems = (groups: SettingsNavGroup[], ctx: SettingsNavContext): SettingsNavItem[] =>
  groups.flatMap((group) => group.items.filter((item) => !item.condition || item.condition(ctx)));
