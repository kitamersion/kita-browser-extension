/* eslint-disable no-case-declarations */
import { v4 as uuidv4 } from "uuid";
import { setVideo } from "../../api/videostorage";
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

const BUTTON_RESET_DELAY_MS = 2000;
const RECORD_BUTTON_ID = "kita-record-button";

const primaryButton = {
  buttonCoreStyles(button: HTMLButtonElement) {
    button.id = RECORD_BUTTON_ID;
    button.style.position = "fixed";
    button.style.top = "12px";
    button.style.left = "300px";
    button.style.color = "white";
    button.style.zIndex = "9999";
    button.style.padding = "8px";
    button.style.borderRadius = "18px";
    button.style.border = "none";
    button.style.fontSize = "10px";
    button.style.textAlign = "center";
    button.style.cursor = "pointer";
  },
  buttonDefaultStyle(button: HTMLButtonElement) {
    button.innerText = "Record Video";
    button.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
    button.style.transition = "background-color 0.3s ease-out";
  },
  buttonSaved(button: HTMLButtonElement) {
    button.innerText = "Record Saved!";
    button.style.backgroundColor = "rgba(0, 255, 0, 0.7)";
    button.style.transition = "background-color 0.3s ease-out";
  },
};

class VideoTracker {
  private static instance: VideoTracker;
  private keyboardShortcutHandler: ((event: KeyboardEvent) => void) | undefined;

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

    console.log("video added from content");
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

  renderButton() {
    const buttonContainer = document.createElement("div");
    const button = document.createElement("button");
    primaryButton.buttonCoreStyles(button);
    primaryButton.buttonDefaultStyle(button);

    button.addEventListener("click", () => {
      this._handleVideoCapture();
      this.showNotification();
    });

    buttonContainer.appendChild(button);
    document.body.appendChild(buttonContainer);
  }

  handleKeyboardShortcut(event: KeyboardEvent) {
    // keyboard shortcut: Shift+A
    if (event.shiftKey && event.key === "A") {
      this._handleVideoCapture();
      this.showNotification();
    }
  }

  setupKeyboardShortcut() {
    this.keyboardShortcutHandler = (event) => this.handleKeyboardShortcut(event);
    document.addEventListener("keydown", this.keyboardShortcutHandler);
  }

  showNotification() {
    const button = document.getElementById(RECORD_BUTTON_ID) as HTMLButtonElement;
    primaryButton.buttonSaved(button);
    setTimeout(() => {
      primaryButton.buttonDefaultStyle(button);
    }, BUTTON_RESET_DELAY_MS);
  }

  isContentLoaded() {
    const indicatorDiv = document.createElement("div");
    indicatorDiv.id = "kitaIndicator";
    indicatorDiv.innerText = "Kita Browser ON";
    indicatorDiv.style.position = "fixed";
    indicatorDiv.style.top = "12px";
    indicatorDiv.style.left = "200px";
    indicatorDiv.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
    indicatorDiv.style.color = "white";
    indicatorDiv.style.zIndex = "9999";
    indicatorDiv.style.padding = "8px";
    indicatorDiv.style.borderRadius = "18px";
    indicatorDiv.style.border = "none";
    indicatorDiv.style.fontSize = "10px";
    indicatorDiv.style.textAlign = "center";
    document.body.appendChild(indicatorDiv);
    return true;
  }

  _youtubeTimelineButton() {
    const parentDiv = document.querySelector(".ytp-right-controls");

    if (parentDiv) {
      const newButton = document.createElement("button");

      newButton.classList.add("ytp-button", "ytp-settings-button");
      newButton.id = "kitabrowserCapture";
      newButton.title = "Capture Video (Shortcut: Shift+A)";

      newButton.addEventListener("click", () => {
        this._handleVideoCapture();
      });

      const baseUrl = this._extensionBaseUrl();
      const newImg = document.createElement("img");
      newImg.src = `${baseUrl}icons/enabled/icon128.png`;
      newImg.style.width = "68%";

      newButton.appendChild(newImg);
      newButton.style.cssText = "margin-top: 8px; vertical-align: top; text-align: center;";

      parentDiv.insertBefore(newButton, parentDiv.firstChild);
    } else {
      console.error("[KITA_BROWSER] Unable to find parent div");
    }
  }

  initialize() {
    const origin = this._getOrigin();
    if (origin) {
      // this.renderButton();
      this.setupKeyboardShortcut();

      switch (origin) {
        case SiteKey.YOUTUBE:
        case SiteKey.YOUTUBE_MUSIC:
          this._youtubeTimelineButton();
          break;
        default:
          console.error("[KITA_BROWSER] UNKNOWN ORIGIN");
          break;
      }
    }
  }

  destory() {
    const indicatorDiv = document.querySelector("#kitaIndicator");
    const recordButton = document.querySelector(`#${RECORD_BUTTON_ID}`);
    if (indicatorDiv) {
      indicatorDiv.remove();
    }
    if (recordButton) {
      recordButton.remove();
    }
    if (this.keyboardShortcutHandler) {
      document.removeEventListener("keydown", this.keyboardShortcutHandler);
    }
  }
}

const videoTracker = VideoTracker.getInstance();
videoTracker.initialize();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`content script received message: ${JSON.stringify(request)}`);
  if (!request.IsApplicationEnabled) {
    videoTracker.destory();
  } else {
    videoTracker.initialize();
  }
});
