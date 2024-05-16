import { Box, Tab, TabList, TabPanels, Tabs } from "@chakra-ui/react";
import React from "react";

const TagTab = React.lazy(() => import("@/pages/settings/tabs/tagsTab"));
const GeneralTab = React.lazy(() => import("@/pages/settings/tabs/generalTab"));
const IntegrationTab = React.lazy(() => import("@/pages/settings/tabs/integrationTab"));

const Settings = () => {
  return (
    <Box as="main">
      <Tabs variant="soft-rounded" colorScheme="green" defaultIndex={0}>
        <TabList gap={1}>
          <Tab>Integration</Tab>
          <Tab>Tags</Tab>
          <Tab>General</Tab>
        </TabList>
        <TabPanels>
          <IntegrationTab />
          <TagTab />
          <GeneralTab />
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default Settings;
