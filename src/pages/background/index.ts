import { VIDEO_ADD } from "@/data/events";
import IndexedDB from "@/db/index";

chrome.runtime.onMessage.addListener(async function (request: { type: string; payload: any }) {
  let parsedPayload;
  try {
    parsedPayload = JSON.parse(request.payload);
  } catch (e) {
    console.error("Error parsing payload", e);
    return;
  }

  if (request.type === VIDEO_ADD) {
    console.log("Received ADD_VIDEO with payload:", parsedPayload);
    await IndexedDB.addVideo(parsedPayload);
  }
});
