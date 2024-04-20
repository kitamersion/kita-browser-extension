import { Box, Button, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import React from "react";
import IndexedDB from "@/db/index";
import { SiteKey } from "@/types/video";
// import { v4 as uuidv4 } from "uuid";

const TagTab = React.lazy(() => import("@/pages/settings/tabs/tagsTab"));
const GeneralTab = React.lazy(() => import("@/pages/settings/tabs/generalTab"));

const Settings = () => {
  const handleCustomEvent = () => {
    console.log(`sending event...`);
    chrome.runtime.sendMessage({ type: "MY_EVENT", payload: "Hello from settings!" });
  };

  const deleteVideoFromIndexDb = () => {
    IndexedDB.deleteVideoById("7c4c64c5-1293-4c95-a059-5d043da4a275");
    console.log("video deleted from IndexedDB");
  };

  const addVideoToIndexDb = () => {
    // const uuid = uuidv4();
    const uuid = "7c4c64c5-1293-4c95-a059-5d043da4a275";
    const video = {
      id: uuid,
      video_title: uuid,
      video_duration: 100,
      video_url: `https://www.youtube.com/watch?v=${uuid}`,
      origin: SiteKey.YOUTUBE,
      created_at: Date.now(),
      tags: [],
    };

    IndexedDB.addVideo(video);
    console.log("video added to IndexedDB");
  };

  const updateVideoInIndexDb = () => {
    const uuid = "7c4c64c5-1293-4c95-a059-5d043da4a275";
    const video = {
      id: uuid,
      video_title: "UPDATED!!!!!!!!!",
      video_duration: 100,
      video_url: `https://www.youtube.com/watch?v=${uuid}`,
      origin: SiteKey.YOUTUBE,
      created_at: Date.now(),
      tags: [],
    };

    IndexedDB.updateVideoById(video);
    console.log("video updated in IndexedDB");
  };

  const [viewVideo, setViewVideo] = React.useState("");
  const handleGetVideo = async () => {
    const video = await IndexedDB.getVideoById("7c4c64c5-1293-4c95-a059-5d043da4a275");
    setViewVideo(video ? JSON.stringify(video) : "No video found");
    console.log("video from IndexedDB", video);
  };

  return (
    <Box as="main">
      <Button onClick={addVideoToIndexDb}>Add Video to IndexDB</Button>
      <Button onClick={deleteVideoFromIndexDb}>Delete Video from IndexDB</Button>
      <Button onClick={updateVideoInIndexDb}>Update Video in IndexDB</Button>
      <Button onClick={handleGetVideo}>Get Video from IndexDB</Button>
      <div>{viewVideo}</div>
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
