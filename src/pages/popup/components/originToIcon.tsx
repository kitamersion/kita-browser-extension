import { SiteKey } from "@/types/video";
import React from "react";
import { SiCrunchyroll, SiYoutube, SiYoutubemusic } from "react-icons/si";
import { FaGlobe } from "react-icons/fa";

type OriginToIcon = {
  siteKey: SiteKey;
  iconSize?: number;
};

const ICON_SIZE = 26;

const OriginToIcon = ({ siteKey, iconSize }: OriginToIcon) => {
  // Site key to icon mapping
  const siteKeyToIconMap: { [key in SiteKey]: React.ReactNode } = {
    [SiteKey.YOUTUBE]: <SiYoutube size={iconSize ?? ICON_SIZE} />,
    [SiteKey.YOUTUBE_MUSIC]: <SiYoutubemusic size={iconSize ?? ICON_SIZE} />,
    [SiteKey.CRUNCHYROLL]: <SiCrunchyroll size={iconSize ?? ICON_SIZE} />,
  };

  const icon = siteKeyToIconMap[siteKey] || <FaGlobe size={iconSize ?? ICON_SIZE} />;

  return <>{icon}</>;
};

export default OriginToIcon;
