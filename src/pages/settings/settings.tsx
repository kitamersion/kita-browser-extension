import { Box, Tab, TabList, TabPanels, Tabs } from "@chakra-ui/react";
import React from "react";
import { useAnilistContext } from "@/context/anilistContext";
import { getSettingsTabIndexFromSearch } from "@/utils";

const TagTab = React.lazy(() => import("@/pages/settings/tabs/tagsTab"));
const GeneralTab = React.lazy(() => import("@/pages/settings/tabs/generalTab"));
const IntegrationTab = React.lazy(() => import("@/pages/settings/tabs/integrationTab"));
const AutoTrackTab = React.lazy(() => import("@/pages/settings/tabs/autoTrackTab"));
const SeriesMappingsTab = React.lazy(() => import("@/pages/settings/tabs/seriesMappingsTab"));
const LogsTab = React.lazy(() => import("@/pages/settings/tabs/logsTab"));
const AnilistTab = React.lazy(() => import("@/pages/settings/tabs/anilistTab"));

const Settings = () => {
  const { anilistAuthStatus } = useAnilistContext();

  return (
    <Box as="main">
      <Tabs
        variant="soft-rounded"
        colorScheme="green"
        defaultIndex={getSettingsTabIndexFromSearch(window.location.search)}
        isLazy
        lazyBehavior="keepMounted"
      >
        <TabList gap={1}>
          <Tab>Integration</Tab>
          <Tab>Auto Track</Tab>
          <Tab>Tags</Tab>
          <Tab>Mappings</Tab>
          <Tab>Logs</Tab>
          <Tab>General</Tab>
          {anilistAuthStatus === "authorized" && <Tab>Anilist</Tab>}
        </TabList>
        <TabPanels>
          <IntegrationTab />
          <AutoTrackTab />
          <TagTab />
          <SeriesMappingsTab />
          <LogsTab />
          <GeneralTab />
          {anilistAuthStatus === "authorized" && <AnilistTab />}
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default Settings;
