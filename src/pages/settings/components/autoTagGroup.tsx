import React from "react";
import { useTagContext } from "@/context/tagContext";
import LoadingState from "@/components/states/LoadingState";
import { SiteKey } from "@/types/video";
import AutoTagByOrigin from "./autoTagByOrigin";
import { useAutoTagContext } from "@/context/autoTagContext";

const AutoTagGroup = () => {
  const { isInitialized: isTagsInitialized } = useTagContext();
  const { isInitialized: isAutoTagsInitialized, totalAutoTags } = useAutoTagContext();

  const siteKeys = Object.values(SiteKey);

  if (!isTagsInitialized && !isAutoTagsInitialized) {
    return <LoadingState />;
  }
  return (
    <>
      {siteKeys.map((site) => (
        <AutoTagByOrigin key={site} origin={site} autoTag={totalAutoTags.find((autoTag) => autoTag.origin === site)} />
      ))}
    </>
  );
};

export default AutoTagGroup;
