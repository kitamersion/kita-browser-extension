import { Flex, TabPanel } from "@chakra-ui/react";
import React, { Suspense } from "react";
import AddTag from "../components/addTag";
import { useTagContext } from "@/context/tagContext";
import LoadingState from "@/components/states/LoadingState";

const TagItem = React.lazy(() => import("@/pages/settings/components/tagItem"));

const TagTab = () => {
  const { tags, isInitialized } = useTagContext();

  if (!isInitialized) {
    return <LoadingState />;
  }
  return (
    <TabPanel>
      <Suspense fallback={<LoadingState />}>
        <Flex flexDirection={"column"} gap={8} alignItems={"flex-start"}>
          <AddTag />
          <Flex gap={2} flexWrap={"wrap"}>
            {tags.map((tag) => (
              <TagItem key={tag.id} id={tag.id} name={tag.name} />
            ))}
          </Flex>
        </Flex>
      </Suspense>
    </TabPanel>
  );
};

export default TagTab;
