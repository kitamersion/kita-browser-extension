/* eslint-disable no-case-declarations */
import { SiteKey, IVideo } from "../../types/video";
import { VIDEO_ADD } from "@/data/events";
import logger from "@/config/logger";
import { CONTENT_SITE_CONFIG } from "@/data/contants";
import { getContentScriptEnabled } from "@/api/applicationStorage";

const BUTTON_RESET_DELAY_MS = 1500;
const CAPTURE_BUTTON_ID = "kitamersion-capture-button";
const CAPTURE_IMAGE_ID = "kitamersion-capture-img";

class VideoTracker {
  private static instance: VideoTracker;
  private keyboardShortcutHandler: ((event: KeyboardEvent) => void) | undefined;
  private timeoutId: NodeJS.Timeout | undefined;

  constructor() {
    this.keyboardShortcutHandler = undefined;
  }

  static getInstance(): VideoTracker {
    if (!VideoTracker.instance) {
      VideoTracker.instance = new VideoTracker();
    }
    return VideoTracker.instance;
  }

  _isVideo() {
    const url = new URL(window.location.href);
    if (!url.search) {
      return false;
    }
    return true;
  }

  _getTitle() {
    let title = document.title;
    Object.values(CONTENT_SITE_CONFIG).forEach(({ replaceString }) => {
      title = title.replace(replaceString, "").trim();
    });
    return title;
  }

  _getOrigin() {
    const url = new URL(window.location.href);
    const hostname = url.hostname;
    for (const key of Object.keys(CONTENT_SITE_CONFIG)) {
      const site = CONTENT_SITE_CONFIG[key as SiteKey];
      if (hostname === site.originUrl) {
        return key as SiteKey;
      }
    }
    return "UNKNOWN" as SiteKey;
  }

  _extensionBaseUrl() {
    return chrome.runtime.getURL("/");
  }

  _handleVideoCapture() {
    this._isVideo();
    const url = window.location.href;
    const videoTitle = this._getTitle();

    const origin = this._getOrigin();
    const site = CONTENT_SITE_CONFIG[origin];

    const durationKey = site?.durationKey;
    const videoDurationElement = document.querySelector(durationKey);
    let videoDurationText = videoDurationElement?.textContent;
    const timestamp = Date.now();

    let videoDuration = 0;

    switch (origin) {
      case SiteKey.YOUTUBE:
      case SiteKey.YOUTUBE_MUSIC:
        const identifyDuration = this.getTotalDuration(videoDurationText ?? "");
        videoDuration = this.convertDurationToSeconds(identifyDuration);
        break;

      case SiteKey.CRUNCHYROLL:
        videoDurationText = videoDurationElement?.getAttribute("content");
        videoDuration = parseInt(videoDurationText ?? "0");
        break;
      default:
        logger.error("UNKNOWN ORIGIN");
        break;
    }

    // Create the video data object
    const newRecord: IVideo = {
      id: self.crypto.randomUUID(),
      video_title: videoTitle,
      video_duration: videoDuration,
      video_url: url,
      origin: origin,
      created_at: timestamp,
      tags: [],
    };

    const payload = JSON.stringify(newRecord);
    chrome.runtime.sendMessage({ type: VIDEO_ADD, payload: payload });

    logger.info("video added from content");
  }

  getTotalDuration(duration: string): string {
    const parts = duration.split("/");
    if (parts.length >= 2) {
      const totalDuration = parts[1].trim();
      return totalDuration;
    }
    return duration.trim();
  }

  convertDurationToSeconds(duration: string): number {
    const timeComponents = duration.split(":").map((component) => parseInt(component));
    let seconds = 0;
    if (timeComponents.length === 3) {
      seconds += timeComponents[0] * 3600; // hours to seconds
      seconds += timeComponents[1] * 60; // minutes to seconds
      seconds += timeComponents[2]; // seconds
    } else if (timeComponents.length === 2) {
      seconds += timeComponents[0] * 60; // minutes to seconds
      seconds += timeComponents[1]; // seconds
    }
    return seconds;
  }

  handleKeyboardShortcut(event: KeyboardEvent) {
    // keyboard shortcut: Shift+A
    if (event.shiftKey && event.key === "A") {
      this._handleVideoCapture();
      this._buttonCapturedIndication();
    }
  }

  setupKeyboardShortcut() {
    this.keyboardShortcutHandler = (event) => this.handleKeyboardShortcut(event);
    document.addEventListener("keydown", this.keyboardShortcutHandler);
  }

  _kitamersionCaptureButton() {
    const parentDiv = document.body;

    if (parentDiv) {
      const newButton = document.createElement("button");

      newButton.id = CAPTURE_BUTTON_ID;
      newButton.title = "Capture Video (Shortcut: Shift+A)";

      newButton.addEventListener("click", () => {
        this._handleVideoCapture();
        this._buttonCapturedIndication();
      });

      const baseUrl = this._extensionBaseUrl();
      const newImg = document.createElement("img");
      newImg.id = CAPTURE_IMAGE_ID;
      newImg.src = `${baseUrl}icons/enabled/icon128.png`;
      newImg.style.width = "100%";

      newButton.appendChild(newImg);
      newButton.style.cssText =
        "width: 3.5em; border: none; background-color: transparent; padding: 0; color: inherit; cursor: pointer; position: fixed; bottom: 1em; right: 1em; opacity: 0.5; transition: opacity 0.2s ease-in-out;";

      newButton.onmouseover = function () {
        (this as HTMLButtonElement).style.opacity = "1";
      };

      newButton.onmouseout = function () {
        (this as HTMLButtonElement).style.opacity = "0.5";
      };

      parentDiv.appendChild(newButton); // Changed to appendChild to add button at the end
    } else {
      logger.error("unable to find parent div");
    }
  }

  _buttonCapturedIndication() {
    const image = document.getElementById(CAPTURE_IMAGE_ID) as HTMLImageElement;
    if (image) {
      const baseUrl = this._extensionBaseUrl();
      image.src = `${baseUrl}icons/saved/icon128.png`;

      if (this.timeoutId) {
        logger.info("timeout cleared");
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(() => {
        image.src = `${baseUrl}icons/enabled/icon128.png`;
      }, BUTTON_RESET_DELAY_MS);
    } else {
      logger.error(`unable to find image with id ${CAPTURE_IMAGE_ID}`);
    }
  }

  initialize() {
    this.setupKeyboardShortcut();
    this._kitamersionCaptureButton();
  }

  destroy() {
    const captureButton = document.getElementById(CAPTURE_BUTTON_ID);

    if (captureButton) {
      captureButton.remove();
    }
    if (this.keyboardShortcutHandler) {
      document.removeEventListener("keydown", this.keyboardShortcutHandler);
    }
  }
}

const videoTracker = VideoTracker.getInstance();

getContentScriptEnabled((isContentEnabled) => {
  isContentEnabled ? videoTracker.initialize() : videoTracker.destroy();
});

// listen for messages to disable/enable content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.info(`content script received message: ${JSON.stringify(request)}`);
  if (!request.IsContentScriptEnabled) {
    videoTracker?.destroy();
  } else {
    videoTracker?.initialize();
  }
});
