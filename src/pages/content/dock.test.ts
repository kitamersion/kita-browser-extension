import { attachDockTo, detachDock, DOCK_ID, getOrCreateDock } from "./dock";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("getOrCreateDock", () => {
  test("creates a single fixed-position flex container appended to the body", () => {
    const dock = getOrCreateDock();

    expect(dock.id).toBe(DOCK_ID);
    expect(dock.parentElement).toBe(document.body);
    expect(dock.style.position).toBe("fixed");
    expect(dock.style.display).toBe("flex");
    expect(dock.style.alignItems).toBe("center");
  });

  test("returns the same element on subsequent calls instead of creating a duplicate", () => {
    const first = getOrCreateDock();
    const second = getOrCreateDock();

    expect(second).toBe(first);
    expect(document.querySelectorAll(`#${DOCK_ID}`)).toHaveLength(1);
  });

  test("children placed in the dock align on one line via flexbox, regardless of their own size", () => {
    const dock = getOrCreateDock();
    const child = document.createElement("div");

    dock.appendChild(child);

    expect(dock.contains(child)).toBe(true);
  });
});

describe("attachDockTo", () => {
  test("moves the dock into the given container as a plain flex item, no longer fixed", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    attachDockTo(container);

    const dock = getOrCreateDock();
    expect(container.contains(dock)).toBe(true);
    expect(dock.style.position).not.toBe("fixed");
    expect(dock.style.display).toBe("flex");
  });

  test("keeps whatever was already inside the dock (e.g. the capture button) when it moves", () => {
    const dock = getOrCreateDock();
    const child = document.createElement("div");
    dock.appendChild(child);
    const container = document.createElement("div");
    document.body.appendChild(container);

    attachDockTo(container);

    expect(dock.contains(child)).toBe(true);
  });
});

describe("detachDock", () => {
  test("restores the dock to a fixed, standalone position on the body", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    attachDockTo(container);

    detachDock();

    const dock = getOrCreateDock();
    expect(dock.parentElement).toBe(document.body);
    expect(dock.style.position).toBe("fixed");
  });
});
