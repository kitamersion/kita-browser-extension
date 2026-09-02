export const PENDING_REVIEW_BADGE_ID = "kitamersion-pending-review-badge";

export const renderPendingReviewBadge = (count: number, onClick: () => void): void => {
  const existing = document.getElementById(PENDING_REVIEW_BADGE_ID);

  if (count <= 0) {
    existing?.remove();
    return;
  }

  if (existing) {
    existing.textContent = String(count);
    return;
  }

  const badge = document.createElement("button");
  badge.id = PENDING_REVIEW_BADGE_ID;
  badge.textContent = String(count);
  badge.title = `${count} AniList match${count === 1 ? "" : "es"} need review - click to resolve`;
  badge.style.cssText =
    "width: 1.6em; height: 1.6em; border-radius: 50%; border: none; background-color: #E53E3E; color: white; font-size: 0.8em; font-weight: bold; cursor: pointer; position: fixed; bottom: 4.6em; right: 1.1em; z-index: 2147483647;";
  badge.addEventListener("click", onClick);

  document.body.appendChild(badge);
};
