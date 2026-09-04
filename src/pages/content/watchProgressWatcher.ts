import { hasReachedWatchThreshold } from "@/utils";

export type WatchProgressWatcher = {
  destroy: () => void;
};

export const createWatchProgressWatcher = (
  video: HTMLVideoElement,
  watchPercentage: number,
  onThresholdReached: () => void
): WatchProgressWatcher => {
  let hasFired = false;

  const handleTimeUpdate = () => {
    if (hasFired) return;
    if (hasReachedWatchThreshold(video.currentTime, video.duration, watchPercentage)) {
      hasFired = true;
      onThresholdReached();
    }
  };

  video.addEventListener("timeupdate", handleTimeUpdate);

  return {
    destroy: () => video.removeEventListener("timeupdate", handleTimeUpdate),
  };
};
