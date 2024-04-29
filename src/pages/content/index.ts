/* eslint-disable no-case-declarations */
import { v4 as uuidv4 } from "uuid";
import { kitaSchema, setVideo } from "../../api/videostorage";
import { SiteConfigDictionary, SiteKey, IVideo } from "../../types/video";
import { incrementTotalVideos } from "@/api/summaryStorage/totalVideos";
import { VIDEO_ADD } from "@/data/events";

const siteConfig: SiteConfigDictionary = {
  [SiteKey.YOUTUBE]: {
    titleLookup: "DOCUMENT_TITLE",
    replaceString: "- YouTube",
    originUrl: "www.youtube.com",
    durationKey: ".ytp-time-duration",
  },
  [SiteKey.YOUTUBE_MUSIC]: {
    titleLookup: "DOCUMENT_TITLE",
    replaceString: "- YouTube",
    originUrl: "music.youtube.com",
    durationKey: ".time-info",
  },
  [SiteKey.CRUNCHYROLL]: {
    titleLookup: "DOCUMENT_TITLE",
    replaceString: "- Watch on Crunchyroll",
    originUrl: "www.crunchyroll.com",
    durationKey: "meta[property='video:duration']",
  },
};

const BUTTON_RESET_DELAY_MS = 1800;
const TIMELINE_CAPTURE_BUTTON_ID = "kitamersion-capture-button";
const TIMELINE_CAPTURE_IMAGE_ID = "kitamersion-capture-img";

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
    Object.values(siteConfig).forEach(({ replaceString }) => {
      title = title.replace(replaceString, "").trim();
    });
    return title;
  }

  _getOrigin() {
    const url = new URL(window.location.href);
    const hostname = url.hostname;
    for (const key of Object.keys(siteConfig)) {
      const site = siteConfig[key as SiteKey];
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
    const site = siteConfig[origin];

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
        console.error("[KITA_BROWSER] UNKNOWN ORIGIN");
        break;
    }

    // Create the video data object
    const newRecord: IVideo = {
      id: uuidv4(),
      video_title: videoTitle,
      video_duration: videoDuration,
      video_url: url,
      origin: origin,
      created_at: timestamp,
      tags: [],
    };

    setVideo(newRecord, () => {
      incrementTotalVideos();
    });

    const payload = JSON.stringify(newRecord);
    chrome.runtime.sendMessage({ type: VIDEO_ADD, payload: payload });

    console.log("[KITA_BROWSER] video added from content");
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

  _youtubeTimelineButton() {
    const parentDiv = document.querySelector(".ytp-right-controls");

    if (parentDiv) {
      const newButton = document.createElement("button");

      newButton.id = TIMELINE_CAPTURE_BUTTON_ID;
      newButton.classList.add("ytp-button", "ytp-settings-button");
      newButton.title = "Capture Video (Shortcut: Shift+A)";

      newButton.addEventListener("click", () => {
        this._handleVideoCapture();
        this._buttonCapturedIndication();
      });

      const baseUrl = this._extensionBaseUrl();
      const newImg = document.createElement("img");
      newImg.id = TIMELINE_CAPTURE_IMAGE_ID;
      newImg.src = `${baseUrl}icons/enabled/icon128.png`;
      newImg.style.width = "54%";

      newButton.appendChild(newImg);
      newButton.style.cssText = "margin-top: 9px; vertical-align: top; text-align: center;";

      parentDiv.insertBefore(newButton, parentDiv.firstChild);
    } else {
      console.error("[KITA_BROWSER] unable to find parent div");
    }
  }

  _buttonCapturedIndication() {
    const image = document.getElementById(TIMELINE_CAPTURE_IMAGE_ID) as HTMLImageElement;
    if (image) {
      const baseUrl = this._extensionBaseUrl();
      image.src = `${baseUrl}icons/saved/icon128.png`;

      if (this.timeoutId) {
        console.log("[KITA_BROWSER] timeout cleared");
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(() => {
        image.src = `${baseUrl}icons/enabled/icon128.png`;
      }, BUTTON_RESET_DELAY_MS);
    } else {
      console.error(`[KITA_BROWSER] unable to find image with id ${TIMELINE_CAPTURE_IMAGE_ID}`);
    }
  }

  _crunchyrollTimelineButton() {
    const parentDiv = document.querySelector(".current-media-parent-ref");

    if (parentDiv) {
      const newButton = document.createElement("button");

      newButton.id = TIMELINE_CAPTURE_BUTTON_ID;
      newButton.title = "Capture Video (Shortcut: Shift+A)";
      newButton.style.width = "22%";

      newButton.addEventListener("click", () => {
        this._handleVideoCapture();
        this._buttonCapturedIndication();
      });

      const baseUrl = this._extensionBaseUrl();
      const newImg = document.createElement("img");
      newImg.id = TIMELINE_CAPTURE_IMAGE_ID;
      newImg.src = `${baseUrl}icons/enabled/icon128.png`;
      newImg.style.width = "40%";

      newButton.appendChild(newImg);

      parentDiv.appendChild(newButton);
    } else {
      console.error("[KITA_BROWSER] unable to find parent div");
    }
  }

  initialize() {
    const origin = this._getOrigin();
    if (origin) {
      this.setupKeyboardShortcut();

      switch (origin) {
        case SiteKey.YOUTUBE:
        case SiteKey.YOUTUBE_MUSIC:
          this._youtubeTimelineButton();
          break;
        case SiteKey.CRUNCHYROLL:
          this._crunchyrollTimelineButton();
          break;
        default:
          console.error("[KITA_BROWSER] UNKNOWN ORIGIN");
          break;
      }
    }
  }

  destroy() {
    const timelineButton = document.getElementById(TIMELINE_CAPTURE_BUTTON_ID);

    if (timelineButton) {
      timelineButton.remove();
    }
    if (this.keyboardShortcutHandler) {
      document.removeEventListener("keydown", this.keyboardShortcutHandler);
    }
  }
}

(() => {
  const videoTracker = VideoTracker.getInstance();

  // @todo: move to service worker (background)
  // check users settings to see if the application should be enabled
  const IsApplicationEnabledKey = kitaSchema.ApplicationSettings.StorageKeys.ApplicationEnabledKey;
  chrome.storage.local.get(IsApplicationEnabledKey, (result) => {
    if (result[IsApplicationEnabledKey].IsApplicationEnabled) {
      videoTracker.initialize();
    } else {
      videoTracker.destroy();
    }
  });

  // listen for messages to disable/enable the application
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(`content script received message: ${JSON.stringify(request)}`);
    if (!request.IsApplicationEnabled) {
      videoTracker.destroy();
    } else {
      videoTracker.initialize();
    }
  });
})();
