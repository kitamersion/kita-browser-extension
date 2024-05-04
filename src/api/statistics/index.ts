import { IVideo } from "@/types/video";

const calculateTotalDuration = (videos: IVideo[]): number => {
  return videos.reduce((total, video) => total + video.video_duration, 0);
};

export { calculateTotalDuration };
