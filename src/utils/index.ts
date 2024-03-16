import { format } from "date-fns";

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
};

export const convertToSeconds = (time: string) => {
  const timeParts = time.split(" ");
  const hours = parseInt(timeParts[0]) * 3600;
  const minutes = parseInt(timeParts[1]) * 60;
  const seconds = parseInt(timeParts[2]);
  return hours + minutes + seconds;
};

export const formatTimestamp = (timestamp: number) => {
  return format(new Date(timestamp), "dd-MM-yyyy");
};
