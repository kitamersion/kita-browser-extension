import React from "react";
import { SiYoutube } from "react-icons/si";
import SourceAutoTrackCard from "./components/SourceAutoTrackCard";

const Youtube = () => <SourceAutoTrackCard platform="youtube" title="YouTube" icon={<SiYoutube />} supportsAutoSync={false} />;

export default Youtube;
