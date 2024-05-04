import { Flex, TabPanel } from "@chakra-ui/react";
import React, { Suspense } from "react";
import AddTag from "../components/addTag";
import { useTagContext } from "@/context/tagContext";
import LoadingState from "@/components/states/LoadingState";
import { SummaryItem } from "@/pages/popup/components/summary";

const TagItem = React.lazy(() => import("@/pages/settings/components/tagItem"));

const TagTab = () => {
  const { totalTagCount, tags, isInitialized } = useTagContext();

  if (!isInitialized) {
    return <LoadingState />;
  }
  return (
    <TabPanel>
      <Suspense fallback={<LoadingState />}>
        <Flex flexDirection={"column"} gap={8} alignItems={"flex-start"}>
          <SummaryItem>
            <SummaryItem.Value value={totalTagCount} />
            <SummaryItem.Title>Total Tags</SummaryItem.Title>
          </SummaryItem>
          <AddTag />
          <Flex gap={2} flexWrap={"wrap"}>
            {tags.map((tag) => (
              <TagItem key={tag.id} tag={tag} showDelete />
            ))}
          </Flex>
        </Flex>
      </Suspense>
    </TabPanel>
  );
};

export default TagTab;
