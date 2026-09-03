export const DOCK_ID = "kitamersion-dock";

const DOCK_FLEX_STYLE = "display: flex; align-items: center; gap: 1em;";
const DOCK_FIXED_STYLE = `position: fixed; bottom: 1em; right: 1em; z-index: 2147483647; ${DOCK_FLEX_STYLE}`;

// A single shared flex row that the capture button and the pending-review pill both live
// in. Aligning them via flexbox instead of separately guessed "bottom"/"right" em offsets
// means they always share the same vertical center and never overlap, even if either
// element's own size changes later.
export const getOrCreateDock = (): HTMLElement => {
  const existing = document.getElementById(DOCK_ID);
  if (existing) return existing;

  const dock = document.createElement("div");
  dock.id = DOCK_ID;
  dock.style.cssText = DOCK_FIXED_STYLE;
  document.body.appendChild(dock);
  return dock;
};

// Moves the dock (and whatever's still inside it - normally just the capture button,
// once the pending-review pill has been removed) into a flex row you own, so spacing
// between it and your own content comes from your own `gap` instead of padding guessed
// to dodge a separately fixed-position element.
export const attachDockTo = (container: HTMLElement): void => {
  const dock = getOrCreateDock();
  dock.style.cssText = DOCK_FLEX_STYLE;
  container.appendChild(dock);
};

// Restores the dock to its normal fixed bottom-right position, standalone again.
export const detachDock = (): void => {
  const dock = getOrCreateDock();
  dock.style.cssText = DOCK_FIXED_STYLE;
  document.body.appendChild(dock);
};
