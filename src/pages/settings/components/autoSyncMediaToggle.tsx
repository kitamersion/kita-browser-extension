import { getAnilistAutoSyncMedia, setAnilistAutoSyncMedia } from "@/api/integration/anilist";
import { IconButton } from "@chakra-ui/react";
import React, { useCallback, useEffect, useState } from "react";
import { LiaSyncAltSolid } from "react-icons/lia";
import { VscSyncIgnored } from "react-icons/vsc";

const AutoSyncMediaToggle = () => {
  const [mediaSyncEnabled, setMediaSyncEnabled] = useState(false);

  useEffect(() => {
    getAnilistAutoSyncMedia((state) => {
      setMediaSyncEnabled(state);
    });
  }, []);

  const toggleMediaSync = useCallback(() => {
    setAnilistAutoSyncMedia(!mediaSyncEnabled, (state) => {
      setMediaSyncEnabled(state);
    });
  }, [mediaSyncEnabled]);

  return (
    <IconButton
      icon={mediaSyncEnabled ? <LiaSyncAltSolid /> : <VscSyncIgnored />}
      aria-label={`AniList auto sync media: ${mediaSyncEnabled ? "Enabled" : "Disabled"}`}
      variant="ghost"
      rounded="full"
      title={`AniList auto sync media: ${mediaSyncEnabled ? "Enabled" : "Disabled"}`}
      onClick={toggleMediaSync}
    />
  );
};

export default AutoSyncMediaToggle;
