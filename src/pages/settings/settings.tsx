import { decrementTotalTags, incrementTotalTags } from "@/api/summaryStorage/totalTags";
import { decrementTotalVideos, incrementTotalVideos } from "@/api/summaryStorage/totalVideos";
import { Box, Button, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import React from "react";

const TagTab = React.lazy(() => import("@/pages/settings/tabs/tagsTab"));
const GeneralTab = React.lazy(() => import("@/pages/settings/tabs/generalTab"));

const Settings = () => {
  const handleCustomEvent = () => {
    console.log(`sending event...`);
    chrome.runtime.sendMessage({ type: "MY_EVENT", payload: "Hello from settings!" });
  };

  const handleIncreaseCounter = () => {
    incrementTotalVideos();
  };

  const handleDecreaseCounter = () => {
    decrementTotalVideos();
  };

  const handleDecreaseTagCounter = () => {
    decrementTotalTags();
  };

  const handleIncreaseTagCounter = () => {
    incrementTotalTags();
  };

  return (
    <Box as="main">
      <Button onClick={handleCustomEvent}>Send Custom Event</Button>
      <Button onClick={handleIncreaseCounter}>Increase Counter</Button>
      <Button onClick={handleDecreaseCounter}>Decrease Counter</Button>
      <Button onClick={handleIncreaseTagCounter}>Increase Tag Counter</Button>
      <Button onClick={handleDecreaseTagCounter}>Decrease Tag Counter</Button>
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
