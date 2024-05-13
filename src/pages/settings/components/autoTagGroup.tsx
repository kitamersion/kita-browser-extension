import React, { useMemo, useCallback } from "react";
import { useTagContext } from "@/context/tagContext";
import LoadingState from "@/components/states/LoadingState";
import { SiteKey } from "@/types/video";
import AutoTagByOrigin from "./autoTagByOrigin";
import { useAutoTagContext } from "@/context/autoTagContext";

const AutoTagGroup = () => {
  const { isInitialized: isTagsInitialized } = useTagContext();
  const { isInitialized: isAutoTagsInitialized, totalAutoTags } = useAutoTagContext();

  const siteKeys = useMemo(() => Object.values(SiteKey), []);
  const totalAutoTagsOrigins = useMemo(() => totalAutoTags.map((autoTag) => autoTag.origin), [totalAutoTags]);
  const remainingOrigins = useMemo(() => siteKeys.filter((site) => !totalAutoTagsOrigins.includes(site)), [siteKeys, totalAutoTagsOrigins]);

  const getAutoTagByOrigin = useCallback(
    (origin: string) => {
      const autoTagToRender = totalAutoTags.find((autoTag) => autoTag.origin === origin);
      return autoTagToRender;
    },
    [totalAutoTags]
  );

  if (!isTagsInitialized && !isAutoTagsInitialized) {
    return <LoadingState />;
  }

  return (
    <>
      {totalAutoTags.map((autoTag) => (
        <AutoTagByOrigin key={autoTag.origin} origin={autoTag.origin} autoTag={autoTag} />
      ))}
      {remainingOrigins.map((origin) => (
        <AutoTagByOrigin key={origin} origin={origin} autoTag={getAutoTagByOrigin(origin)} />
      ))}
    </>
  );
};

export default AutoTagGroup;
