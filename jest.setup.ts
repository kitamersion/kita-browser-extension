// jsdom's global scope doesn't include structuredClone, which fake-indexeddb
// needs internally. Our data is plain JSON-serializable objects, so this is
// sufficient for tests even though it isn't a spec-complete polyfill.
if (typeof (globalThis as any).structuredClone !== "function") {
  (globalThis as any).structuredClone = (value: unknown) => JSON.parse(JSON.stringify(value));
}

// jsdom's crypto doesn't implement randomUUID, which production code relies on
// (self.crypto.randomUUID()). Node's real implementation is a global in the
// underlying process, so just wire it up.
import { randomUUID } from "crypto";
if (typeof (globalThis as any).crypto?.randomUUID !== "function") {
  if (!(globalThis as any).crypto) {
    (globalThis as any).crypto = {};
  }
  (globalThis as any).crypto.randomUUID = randomUUID;
}

// @kitamersion/kita-logging persists history to IndexedDB internally, which
// jsdom doesn't provide. Polyfill it so any test exercising code that logs
// doesn't crash the worker with "indexedDB is not defined".
import "fake-indexeddb/auto";

// @testing-library/user-event v14 patches HTMLElement.prototype.focus as a
// getter-only accessor (in patchFocus.js) for focus/blur simulation. Chakra UI
// v2's Checkbox/Radio use @zag-js/focus-visible's trackFocusVisible, which
// attempts to reassign that property, colliding with user-event's patch and
// throwing "TypeError: Cannot set property focus of [object HTMLElement] which
// has only a getter". Work around this by stubbing trackFocusVisible while
// preserving the real implementations of other exports.
jest.mock("@zag-js/focus-visible", () => ({
  ...jest.requireActual("@zag-js/focus-visible"),
  trackFocusVisible: () => {},
}));
