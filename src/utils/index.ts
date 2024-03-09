import { format } from "date-fns";

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
};

export const formatTimestamp = (timestamp: number) => {
  return format(new Date(timestamp), "dd-MM-yyyy");
};
