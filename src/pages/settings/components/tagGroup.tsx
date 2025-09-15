import { Box, Flex } from "@chakra-ui/react";
import React from "react";
import AddTag from "./addTag";
import { useTagContext } from "@/context/tagContext";
import LoadingState from "@/components/states/LoadingState";
import SummaryItem from "@/components/summaryItem";
import QuickAddTags from "./quickAddTags";

const TagItem = React.lazy(() => import("@/pages/settings/components/tagItem"));

const TagGroup = () => {
  const { totalTagCount, tags, isInitialized } = useTagContext();

  if (!isInitialized) {
    return <LoadingState />;
  }
  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <Flex flexDirection={"column"} gap={8} alignItems={"flex-start"}>
        <SummaryItem>
          <SummaryItem.Value value={totalTagCount} />
          <SummaryItem.Title>Total Tags</SummaryItem.Title>
        </SummaryItem>
        <QuickAddTags />
        <AddTag />
        <Flex gap={2} flexWrap={"wrap"}>
          {tags.map((tag) => (
            <TagItem key={tag.id} tag={tag} showDelete />
          ))}
        </Flex>
      </Flex>
    </Box>
  );
};

export default TagGroup;
