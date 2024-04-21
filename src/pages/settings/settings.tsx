import { Box, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import React from "react";

const TagTab = React.lazy(() => import("@/pages/settings/tabs/tagsTab"));
const GeneralTab = React.lazy(() => import("@/pages/settings/tabs/generalTab"));

const Settings = () => {
  return (
    <Box as="main">
      <Tabs variant="soft-rounded" colorScheme="green">
        <TabList gap={1}>
          <Tab>General</Tab>
          <Tab>Tags</Tab>
          <Tab>Category</Tab>
        </TabList>
        <TabPanels>
          <GeneralTab />
          <TagTab />
          <TabPanel>
            <p>Coming soon...</p>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default Settings;
