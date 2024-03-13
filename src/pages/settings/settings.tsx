import { Box, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import React from "react";

const TagTab = React.lazy(() => import("@/pages/settings/tabs/tagsTab"));

const Settings = () => {
  return (
    <Box as="main">
      <Tabs variant="soft-rounded" colorScheme="green">
        <TabList>
          <Tab>Tags</Tab>
          <Tab>Category</Tab>
          <Tab>General</Tab>
        </TabList>
        <TabPanels>
          <TagTab />
          <TabPanel>
            <p>Coming soon...</p>
          </TabPanel>
          <TabPanel>
            <p>Coming soon...</p>
            <p>Import data</p>
            <p>Export data</p>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default Settings;
