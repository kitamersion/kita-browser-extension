import { SiteKey } from "@/types/video";
import React from "react";
import { SiAtandt, SiCrunchyroll, SiYoutube, SiYoutubemusic } from "react-icons/si";

type OriginToIcon = {
  siteKey: SiteKey;
};

const ICON_SIZE = 26;

const OriginToIcon = ({ siteKey }: OriginToIcon) => {
  // Site key to icon mapping
  const siteKeyToIconMap: { [key in SiteKey]: React.ReactNode } = {
    [SiteKey.YOUTUBE]: <SiYoutube size={ICON_SIZE} />,
    [SiteKey.YOUTUBE_MUSIC]: <SiYoutubemusic size={ICON_SIZE} />,
    [SiteKey.CRUNCHYROLL]: <SiCrunchyroll size={ICON_SIZE} />,
  };

  const icon = siteKeyToIconMap[siteKey] || <SiAtandt size={ICON_SIZE} />;

  return <>{icon}</>;
};

export default OriginToIcon;
