import {
  PENDING_REVIEW_BANNER_ID,
  PENDING_REVIEW_BANNER_REVIEW_BUTTON_ID,
  PENDING_REVIEW_BANNER_TOGGLE_ID,
  PENDING_REVIEW_PILL_ID,
  renderPendingReviewBanner,
} from "./pendingReviewBanner";
import { DOCK_ID, getOrCreateDock } from "./dock";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderPendingReviewBanner", () => {
  test("shows nothing when there is nothing pending", () => {
    renderPendingReviewBanner(0, [], jest.fn());

    expect(document.getElementById(PENDING_REVIEW_PILL_ID)).toBeNull();
    expect(document.getElementById(PENDING_REVIEW_BANNER_ID)).toBeNull();
  });

  test("starts collapsed as a pill showing the count and an open indicator", () => {
    renderPendingReviewBanner(3, ["Dragon Ball"], jest.fn());

    const pill = document.getElementById(PENDING_REVIEW_PILL_ID);
    expect(pill?.textContent).toContain("3");
    expect(pill?.textContent).toContain("need review");
    expect(pill?.textContent).toContain("▴");
    expect(document.getElementById(PENDING_REVIEW_BANNER_ID)).toBeNull();
  });

  test("always starts collapsed on a fresh render, even with a high count", () => {
    renderPendingReviewBanner(50, ["Dragon Ball"], jest.fn());

    expect(document.getElementById(PENDING_REVIEW_PILL_ID)).not.toBeNull();
    expect(document.getElementById(PENDING_REVIEW_BANNER_ID)).toBeNull();
  });

  test("clicking the pill replaces it with the full-width banner", () => {
    renderPendingReviewBanner(2, ["Dragon Ball", "One Piece"], jest.fn());

    document.getElementById(PENDING_REVIEW_PILL_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(document.getElementById(PENDING_REVIEW_PILL_ID)).toBeNull();
    const banner = document.getElementById(PENDING_REVIEW_BANNER_ID);
    expect(banner?.textContent).toContain("2 AniList matches need review");
    expect(banner?.textContent).toContain("Dragon Ball and One Piece");
    expect(document.getElementById(PENDING_REVIEW_BANNER_REVIEW_BUTTON_ID)).not.toBeNull();
    expect(document.getElementById(PENDING_REVIEW_BANNER_TOGGLE_ID)?.textContent).toContain("▾");
  });

  test("slides the banner down before it actually collapses back into the pill", () => {
    jest.useFakeTimers();
    renderPendingReviewBanner(2, ["Dragon Ball", "One Piece"], jest.fn());
    document.getElementById(PENDING_REVIEW_PILL_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    document.getElementById(PENDING_REVIEW_BANNER_TOGGLE_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // still present immediately after the click, now animating back down
    const banner = document.getElementById(PENDING_REVIEW_BANNER_ID);
    expect(banner).not.toBeNull();
    expect(banner?.style.transform).toBe("translateY(100%)");
    expect(document.getElementById(PENDING_REVIEW_PILL_ID)).toBeNull();

    jest.advanceTimersByTime(500);

    expect(document.getElementById(PENDING_REVIEW_BANNER_ID)).toBeNull();
    expect(document.getElementById(PENDING_REVIEW_PILL_ID)).not.toBeNull();
    jest.useRealTimers();
  });

  test("calls the review handler when the review button is clicked, without collapsing", () => {
    const onReview = jest.fn();
    renderPendingReviewBanner(1, ["Dragon Ball"], onReview);
    document.getElementById(PENDING_REVIEW_PILL_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    document.getElementById(PENDING_REVIEW_BANNER_REVIEW_BUTTON_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onReview).toHaveBeenCalledTimes(1);
    expect(document.getElementById(PENDING_REVIEW_BANNER_ID)).not.toBeNull();
  });

  test("stays expanded and refreshes its content across re-renders", () => {
    renderPendingReviewBanner(1, ["Dragon Ball"], jest.fn());
    document.getElementById(PENDING_REVIEW_PILL_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    renderPendingReviewBanner(2, ["Dragon Ball", "One Piece"], jest.fn());

    expect(document.getElementById(PENDING_REVIEW_PILL_ID)).toBeNull();
    expect(document.getElementById(PENDING_REVIEW_BANNER_ID)?.textContent).toContain("2 AniList matches need review");
  });

  test("stays collapsed and refreshes the pill's count across re-renders", () => {
    renderPendingReviewBanner(1, ["Dragon Ball"], jest.fn());

    renderPendingReviewBanner(2, ["Dragon Ball", "One Piece"], jest.fn());

    expect(document.getElementById(PENDING_REVIEW_PILL_ID)?.textContent).toContain("2");
    expect(document.getElementById(PENDING_REVIEW_BANNER_ID)).toBeNull();
  });

  test("moves the dock (holding the capture button) into the banner's action row when expanded", () => {
    const captureButton = document.createElement("button");
    getOrCreateDock().appendChild(captureButton);

    renderPendingReviewBanner(1, ["Dragon Ball"], jest.fn());
    document.getElementById(PENDING_REVIEW_PILL_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const dock = document.getElementById(DOCK_ID);
    const banner = document.getElementById(PENDING_REVIEW_BANNER_ID);
    expect(banner?.contains(dock)).toBe(true);
    expect(dock?.contains(captureButton)).toBe(true);
    expect(dock?.style.position).not.toBe("fixed");
  });

  test("keeps the capture button inside the dock across a re-render while already expanded", () => {
    const captureButton = document.createElement("button");
    getOrCreateDock().appendChild(captureButton);
    renderPendingReviewBanner(1, ["Dragon Ball"], jest.fn());
    document.getElementById(PENDING_REVIEW_PILL_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    renderPendingReviewBanner(2, ["Dragon Ball", "One Piece"], jest.fn());

    const dock = document.getElementById(DOCK_ID);
    const banner = document.getElementById(PENDING_REVIEW_BANNER_ID);
    expect(banner?.contains(dock)).toBe(true);
    expect(dock?.contains(captureButton)).toBe(true);
  });

  test("returns the dock to its fixed standalone position when collapsing back to the pill", () => {
    jest.useFakeTimers();
    const captureButton = document.createElement("button");
    getOrCreateDock().appendChild(captureButton);
    renderPendingReviewBanner(1, ["Dragon Ball"], jest.fn());
    document.getElementById(PENDING_REVIEW_PILL_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    document.getElementById(PENDING_REVIEW_BANNER_TOGGLE_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    jest.advanceTimersByTime(500);

    const dock = document.getElementById(DOCK_ID);
    expect(dock?.parentElement).toBe(document.body);
    expect(dock?.style.position).toBe("fixed");
    expect(dock?.contains(captureButton)).toBe(true);
    expect(dock?.contains(document.getElementById(PENDING_REVIEW_PILL_ID))).toBe(true);
    jest.useRealTimers();
  });

  test("removes everything, collapsed or expanded, once the pending count drops to zero", () => {
    renderPendingReviewBanner(1, ["Dragon Ball"], jest.fn());
    document.getElementById(PENDING_REVIEW_PILL_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    renderPendingReviewBanner(0, [], jest.fn());

    expect(document.getElementById(PENDING_REVIEW_PILL_ID)).toBeNull();
    expect(document.getElementById(PENDING_REVIEW_BANNER_ID)).toBeNull();
  });
});
