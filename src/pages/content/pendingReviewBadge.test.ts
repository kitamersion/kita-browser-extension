import { PENDING_REVIEW_BADGE_ID, renderPendingReviewBadge } from "./pendingReviewBadge";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("renderPendingReviewBadge", () => {
  test("does not add a badge when there is nothing pending", () => {
    renderPendingReviewBadge(0, jest.fn());

    expect(document.getElementById(PENDING_REVIEW_BADGE_ID)).toBeNull();
  });

  test("adds a badge showing the pending count", () => {
    renderPendingReviewBadge(3, jest.fn());

    const badge = document.getElementById(PENDING_REVIEW_BADGE_ID);
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("3");
  });

  test("updates an existing badge's count instead of adding a duplicate", () => {
    renderPendingReviewBadge(1, jest.fn());
    renderPendingReviewBadge(5, jest.fn());

    expect(document.querySelectorAll(`#${PENDING_REVIEW_BADGE_ID}`)).toHaveLength(1);
    expect(document.getElementById(PENDING_REVIEW_BADGE_ID)?.textContent).toBe("5");
  });

  test("removes the badge once the pending count drops to zero", () => {
    renderPendingReviewBadge(2, jest.fn());
    renderPendingReviewBadge(0, jest.fn());

    expect(document.getElementById(PENDING_REVIEW_BADGE_ID)).toBeNull();
  });

  test("calls the click handler when clicked", () => {
    const onClick = jest.fn();
    renderPendingReviewBadge(1, onClick);

    document.getElementById(PENDING_REVIEW_BADGE_ID)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
