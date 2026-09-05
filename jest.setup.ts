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

// jsdom doesn't support the focus property setter on HTMLElement, which
// Chakra UI v2's focus-visible tracking needs. Mock the module to prevent
// focus tracking errors in tests.
jest.mock("@zag-js/focus-visible", () => ({
  trackFocusVisible: () => {},
  observeFocusVisible: () => {},
}));
