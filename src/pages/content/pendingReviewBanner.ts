import { formatPendingSeriesSummary } from "@/utils";
import { attachDockTo, detachDock, getOrCreateDock } from "./dock";

export const PENDING_REVIEW_PILL_ID = "kitamersion-pending-review-pill";
export const PENDING_REVIEW_BANNER_ID = "kitamersion-pending-review-banner";
export const PENDING_REVIEW_BANNER_REVIEW_BUTTON_ID = "kitamersion-pending-review-banner-review";
export const PENDING_REVIEW_BANNER_TOGGLE_ID = "kitamersion-pending-review-toggle";

// Matches src/config/theme.ts's kita.bg.primary / kita.border.primary / kita.primary /
// kita.text.primary so this content-script element (which can't use Chakra) still reads
// as part of the same dark extension UI as the popup and settings pages.
const DARK_BG = "rgba(0, 0, 0, 0.95)";
const BORDER = "rgba(255, 255, 255, 0.1)";
const ACCENT = "#FF6347";
const TEXT = "#FFFFFF";

// Lives in the shared dock (see dock.ts) alongside the capture button, so flexbox
// centers them on the same line automatically - no guessed em offsets to keep in sync
// if either element's size ever changes.
const PILL_STYLE = `box-sizing: border-box; height: 2.2em; padding: 0 0.9em; border-radius: 999px; background-color: ${DARK_BG}; border: 1px solid ${ACCENT}; color: ${TEXT}; font-size: 0.85em; font-weight: bold; white-space: nowrap; cursor: pointer; display: flex; align-items: center; justify-content: center;`;

// Kept in sync with the transition duration below so the close handler waits exactly as
// long as the slide-down animation takes before actually swapping the banner for the pill.
const SLIDE_ANIMATION_MS = 160;

// The dock (with the capture button) is moved directly into this banner's `actions` row
// (see attachDockTo below) once expanded, so no padding needs to be guessed here to dodge
// a separately fixed-position element - the flex row's own `gap` handles that spacing.
const BANNER_STYLE = `position: fixed; bottom: 0; left: 0; width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 1em; padding: 0.8em 1.2em; background-color: ${DARK_BG}; border-top: 1px solid ${BORDER}; color: ${TEXT}; font-size: 0.9em; transition: transform ${SLIDE_ANIMATION_MS}ms ease-in-out; z-index: 2147483646;`;
const COLLAPSED_TRANSFORM = "transform: translateY(100%);";
const EXPANDED_TRANSFORM = "transform: translateY(0);";

const reviewButtonStyle = `border: none; background-color: ${ACCENT}; color: white; border-radius: 4px; padding: 0.4em 0.9em; cursor: pointer; font-weight: bold; white-space: nowrap;`;
const TOGGLE_BUTTON_BG = "transparent";
const TOGGLE_BUTTON_BG_HOVER = "rgba(255, 255, 255, 0.12)";
const toggleButtonStyle = `border: 1px solid transparent; border-radius: 6px; background-color: ${TOGGLE_BUTTON_BG}; color: ${TEXT}; cursor: pointer; font-size: 1.1em; font-weight: bold; line-height: 1; padding: 0.35em 0.55em; transition: background-color 0.15s ease-in-out;`;

const removePill = (): void => {
  document.getElementById(PENDING_REVIEW_PILL_ID)?.remove();
};

const removeBanner = (): void => {
  document.getElementById(PENDING_REVIEW_BANNER_ID)?.remove();
};

const renderPill = (count: number, seriesTitles: string[], onReview: () => void): void => {
  // Must detach the dock (pulling the capture button back out) before removing the
  // banner, or the dock - currently nested inside it - gets destroyed along with it.
  detachDock();
  removeBanner();

  let pill = document.getElementById(PENDING_REVIEW_PILL_ID);
  if (!pill) {
    pill = document.createElement("button");
    pill.id = PENDING_REVIEW_PILL_ID;
    pill.style.cssText = PILL_STYLE;
    // Prepended so it renders to the left of the capture button (the dock's other child).
    getOrCreateDock().prepend(pill);
  }
  pill.textContent = `⚠ ${count} need review ▴`;
  pill.onclick = () => renderBanner(count, seriesTitles, onReview);
};

// Slides up from below the viewport (translateY 100% -> 0) instead of popping/scaling in,
// with a fast, symmetric ease-in-out and no overshoot past its final position.
const renderBanner = (count: number, seriesTitles: string[], onReview: () => void, animate = true): void => {
  removePill();
  // Detach before removing any existing banner - the dock may currently be nested inside
  // it (from a previous render), and removing the banner would destroy the dock with it.
  detachDock();

  const isNew = !document.getElementById(PENDING_REVIEW_BANNER_ID);
  removeBanner();

  const banner = document.createElement("div");
  banner.id = PENDING_REVIEW_BANNER_ID;

  const info = document.createElement("div");
  const title = document.createElement("div");
  title.style.fontWeight = "bold";
  title.textContent = `⚠ ${count} AniList match${count === 1 ? "" : "es"} need${count === 1 ? "s" : ""} review`;
  const summary = document.createElement("div");
  summary.style.cssText = "margin-top: 0.2em; opacity: 0.85;";
  summary.textContent = formatPendingSeriesSummary(seriesTitles);
  info.append(title, summary);

  const actions = document.createElement("div");
  actions.style.cssText = "display: flex; align-items: center; gap: 1em;";

  const reviewButton = document.createElement("button");
  reviewButton.id = PENDING_REVIEW_BANNER_REVIEW_BUTTON_ID;
  reviewButton.textContent = "Review";
  reviewButton.style.cssText = reviewButtonStyle;
  reviewButton.addEventListener("click", (event) => {
    event.stopPropagation();
    onReview();
  });

  const toggleButton = document.createElement("button");
  toggleButton.id = PENDING_REVIEW_BANNER_TOGGLE_ID;
  toggleButton.textContent = "▾";
  toggleButton.title = "Collapse";
  toggleButton.style.cssText = toggleButtonStyle;
  toggleButton.onmouseover = () => {
    toggleButton.style.backgroundColor = TOGGLE_BUTTON_BG_HOVER;
  };
  toggleButton.onmouseout = () => {
    toggleButton.style.backgroundColor = TOGGLE_BUTTON_BG;
  };
  toggleButton.addEventListener("click", (event) => {
    event.stopPropagation();
    // Play the slide-down transition first, then actually swap to the pill once it's
    // finished - collapsing immediately would just make the banner disappear instantly.
    banner.style.cssText = `${BANNER_STYLE} ${COLLAPSED_TRANSFORM}`;
    setTimeout(() => {
      renderPill(count, seriesTitles, onReview);
    }, SLIDE_ANIMATION_MS);
  });

  actions.append(reviewButton, toggleButton);
  banner.append(info, actions);

  document.body.appendChild(banner);
  // Moves the dock (now holding just the capture button, since the pill was just removed
  // above) into this row, so its spacing comes from `actions`' own `gap` instead of the
  // banner guessing padding to dodge a separately fixed-position element.
  attachDockTo(actions);

  if (isNew && animate) {
    banner.style.cssText = `${BANNER_STYLE} ${COLLAPSED_TRANSFORM}`;
    const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn: () => void) => setTimeout(fn, 0);
    raf(() => {
      banner.style.cssText = `${BANNER_STYLE} ${EXPANDED_TRANSFORM}`;
    });
  } else {
    banner.style.cssText = `${BANNER_STYLE} ${EXPANDED_TRANSFORM}`;
  }
};

export const renderPendingReviewBanner = (count: number, seriesTitles: string[], onReview: () => void): void => {
  if (count <= 0) {
    removePill();
    removeBanner();
    return;
  }

  const isExpanded = !!document.getElementById(PENDING_REVIEW_BANNER_ID);
  if (isExpanded) {
    renderBanner(count, seriesTitles, onReview, false);
  } else {
    renderPill(count, seriesTitles, onReview);
  }
};
