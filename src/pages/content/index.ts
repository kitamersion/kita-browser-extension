/* eslint-disable no-case-declarations */
import { SiteKey, IVideo } from "../../types/video";
import { OPEN_ANILIST_PENDING_REVIEW, VIDEO_ADD } from "@/data/events";
import { logger } from "@kitamersion/kita-logging";
import { CONTENT_SITE_CONFIG } from "@/data/contants";
import { getContentScriptEnabled } from "@/api/applicationStorage";
import { getSourceAutoTrackConfig } from "@/api/sourceTracking";
import { getPendingAnilistSyncs } from "@/api/integration/anilistPendingSync";
import { mapSiteKeyToSourcePlatform } from "@/utils";
import { createWatchProgressWatcher, WatchProgressWatcher } from "./watchProgressWatcher";
import { renderPendingReviewBanner } from "./pendingReviewBanner";
import { getOrCreateDock } from "./dock";
import { SETTINGS } from "@/api/settings/definitions";

const BUTTON_RESET_DELAY_MS = 1500;
const CAPTURE_BUTTON_ID = "kitamersion-capture-button";
const CAPTURE_IMAGE_ID = "kitamersion-capture-img";
const WATCH_PROGRESS_POLL_MS = 2000;

class VideoTracker {
  private static instance: VideoTracker;
  private keyboardShortcutHandler: ((event: KeyboardEvent) => void) | undefined;
  private timeoutId: NodeJS.Timeout | undefined;
  private lastCaptureTime = 0;
  private readonly CAPTURE_DEBOUNCE_MS = 2000; // Prevent captures within 2 seconds
  private watchProgressPollId: ReturnType<typeof setInterval> | undefined;
  private watchProgressWatcher: WatchProgressWatcher | undefined;
  private trackedVideoElement: HTMLVideoElement | undefined;
  private trackedVideoSrc: string | undefined;
  private pendingReviewStorageListener: ((changes: { [key: string]: chrome.storage.StorageChange }) => void) | undefined;

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
    const origin = this._getOrigin();

    // More specific video page detection
    switch (origin) {
      case SiteKey.CRUNCHYROLL:
        // Crunchyroll video pages typically have /watch/ in the URL
        return url.pathname.includes("/watch/");
      case SiteKey.YOUTUBE:
      case SiteKey.YOUTUBE_MUSIC:
        // YouTube video pages have watch parameter
        return url.searchParams.has("v");
      default:
        // Fallback to generic check
        return !!url.search;
    }
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

  async _handleVideoCapture() {
    logger.info(`_handleVideoCapture called on: ${window.location.href}`);

    // Debounce: prevent rapid successive captures
    const now = Date.now();
    if (now - this.lastCaptureTime < this.CAPTURE_DEBOUNCE_MS) {
      logger.info(`video capture debounced (${now - this.lastCaptureTime}ms since last capture)`);
      return;
    }
    this.lastCaptureTime = now;

    // Only capture if we're actually on a video page
    if (!this._isVideo()) {
      logger.info("not on a video page, skipping capture");
      return;
    }

    logger.info("proceeding with video capture...");
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
        videoDurationText = videoDurationElement?.getAttribute("content") ?? undefined;
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

    if (origin === SiteKey.CRUNCHYROLL) {
      const { seriesTitle, episodeNumber, seasonYear } = this._crunchyrollSeriesMetadata();
      newRecord.series_title = seriesTitle;
      newRecord.watching_episode_number = parseInt(episodeNumber) || undefined;
      newRecord.watching_season_year = seasonYear;
      newRecord.media_type = "ANIME";
    }

    const payload = JSON.stringify(newRecord);
    logger.info(`attempting to send VIDEO_ADD message for: ${videoTitle} (${origin}) - ${url}`);

    chrome.runtime.sendMessage({ type: VIDEO_ADD, payload: payload }, (response) => {
      if (chrome.runtime.lastError) {
        logger.error(`failed to send VIDEO_ADD message: ${chrome.runtime.lastError.message}`);
      } else {
        logger.info(`VIDEO_ADD message sent successfully: ${JSON.stringify(response)}`);
      }
    });

    logger.info("video added from content");
  }

  _crunchyrollSeriesMetadata() {
    const scriptElements = document.querySelectorAll("script[type='application/ld+json']");

    for (const scriptElement of scriptElements) {
      const scriptContent = scriptElement.textContent;
      if (scriptContent) {
        const metadata = JSON.parse(scriptContent);
        if (metadata["@type"] === "TVEpisode") {
          const seriesTitle = metadata.partOfSeries?.name;
          const episodeNumber = metadata.episodeNumber;
          const seasonYear = new Date(metadata.datePublished).getFullYear();
          return {
            seriesTitle: seriesTitle ?? undefined,
            episodeNumber: episodeNumber ?? undefined,
            seasonYear: seasonYear ?? undefined,
          };
        }
      }
    }

    return {
      seriesTitle: undefined,
      episodeNumber: undefined,
      seasonYear: undefined,
    };
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
    const dock = getOrCreateDock();
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
    newImg.style.cssText = "width: 100%; display: block;";

    newButton.appendChild(newImg);
    // The dock (a shared flex row) owns fixed positioning and vertical centering, so
    // this only needs its own size - resizing it later never requires touching the
    // pending-review pill's positioning to keep them lined up. Uses rem (root-relative)
    // rather than em (inherited-relative) so its size stays constant even when the dock
    // gets moved inside the banner, which sets its own smaller font-size on itself.
    newButton.style.cssText =
      "width: 2.2rem; height: 2.2rem; display: flex; align-items: center; justify-content: center; border: none; background-color: transparent; padding: 0; color: inherit; cursor: pointer; opacity: 0.5; transition: opacity 0.2s ease-in-out;";

    newButton.onmouseover = function () {
      (this as HTMLButtonElement).style.opacity = "1";
    };

    newButton.onmouseout = function () {
      (this as HTMLButtonElement).style.opacity = "0.5";
    };

    dock.appendChild(newButton);
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
    this._startWatchProgressPolling();
    this._startPendingReviewBanner();
  }

  destroy() {
    const captureButton = document.getElementById(CAPTURE_BUTTON_ID);

    if (captureButton) {
      captureButton.remove();
    }
    if (this.keyboardShortcutHandler) {
      document.removeEventListener("keydown", this.keyboardShortcutHandler);
    }
    this._stopWatchProgressPolling();
    this._stopPendingReviewBanner();
  }

  _refreshPendingReviewBanner() {
    getPendingAnilistSyncs().then((pending) => {
      renderPendingReviewBanner(
        pending.length,
        pending.map((entry) => entry.series_title),
        () => {
          chrome.runtime.sendMessage({ type: OPEN_ANILIST_PENDING_REVIEW });
        }
      );
    });
  }

  _startPendingReviewBanner() {
    this._refreshPendingReviewBanner();

    this.pendingReviewStorageListener = (changes) => {
      if (SETTINGS.integrations.anilist.pendingSync.key in changes) {
        this._refreshPendingReviewBanner();
      }
    };
    chrome.storage.onChanged.addListener(this.pendingReviewStorageListener);
  }

  _stopPendingReviewBanner() {
    if (this.pendingReviewStorageListener) {
      chrome.storage.onChanged.removeListener(this.pendingReviewStorageListener);
      this.pendingReviewStorageListener = undefined;
    }
    renderPendingReviewBanner(0, [], () => {});
  }

  _startWatchProgressPolling() {
    if (this.watchProgressPollId) return;
    this.watchProgressPollId = setInterval(() => {
      this._refreshWatchProgressTracking();
    }, WATCH_PROGRESS_POLL_MS);
  }

  _stopWatchProgressPolling() {
    if (this.watchProgressPollId) {
      clearInterval(this.watchProgressPollId);
      this.watchProgressPollId = undefined;
    }
    this.watchProgressWatcher?.destroy();
    this.watchProgressWatcher = undefined;
    this.trackedVideoElement = undefined;
    this.trackedVideoSrc = undefined;
  }

  // Auto-capture at a configurable % watched. Sites like Crunchyroll/YouTube are
  // SPAs that can swap episodes without reloading this script - sometimes reusing
  // the same <video> element - so a source change is detected by src, not just
  // element identity, and re-checked on the settings response in case a newer
  // navigation happened while that lookup was in flight.
  async _refreshWatchProgressTracking() {
    const video = document.querySelector("video");
    if (!video) return;

    const currentSrc = video.currentSrc || video.src;
    if (video === this.trackedVideoElement && currentSrc === this.trackedVideoSrc) {
      return;
    }

    logger.info(`[auto-track] new video detected (src=${currentSrc})`);

    this.watchProgressWatcher?.destroy();
    this.watchProgressWatcher = undefined;
    this.trackedVideoElement = video;
    this.trackedVideoSrc = currentSrc;

    const platform = mapSiteKeyToSourcePlatform(this._getOrigin());
    if (!platform) {
      logger.debug(`[auto-track] origin ${this._getOrigin()} has no auto-track source mapping, skipping`);
      return;
    }

    const config = await getSourceAutoTrackConfig(platform);
    logger.info(`[auto-track] ${platform} config: enabled=${config.enabled}, watchPercentage=${config.watchPercentage}`);
    if (!config.enabled) {
      logger.debug(`[auto-track] auto-track disabled for ${platform}, skipping`);
      return;
    }

    if (this.trackedVideoElement !== video || this.trackedVideoSrc !== currentSrc) {
      logger.debug("[auto-track] video changed while loading config, aborting stale watcher setup");
      return;
    }

    logger.info(`[auto-track] watching ${platform} video for ${config.watchPercentage}% watched`);
    this.watchProgressWatcher = createWatchProgressWatcher(video, config.watchPercentage, () => {
      logger.info(`[auto-track] ${config.watchPercentage}% threshold reached for ${platform}, auto-capturing video`);
      this._handleVideoCapture();
    });
  }
}

const videoTracker = VideoTracker.getInstance();

getContentScriptEnabled((isContentEnabled) => {
  isContentEnabled ? videoTracker.initialize() : videoTracker.destroy();
});

// listen for messages to disable/enable content script
chrome.runtime.onMessage.addListener((request) => {
  logger.info(`content script received message: ${JSON.stringify(request)}`);
  if (!request.IsContentScriptEnabled) {
    videoTracker?.destroy();
  } else {
    videoTracker?.initialize();
  }
});
