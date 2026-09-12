import { chromeStorageAdapter } from "./chromeStorageAdapter";

const createChromeStub = () => {
  const store: Record<string, unknown> = {};
  return {
    storage: {
      local: {
        get: (key: string, callback: (data: any) => void) => callback({ [key]: store[key] }),
        set: (data: Record<string, unknown>, callback: () => void) => {
          Object.assign(store, data);
          callback();
        },
        remove: (key: string, callback: () => void) => {
          delete store[key];
          callback();
        },
      },
    },
  };
};

describe("chromeStorageAdapter", () => {
  beforeEach(() => {
    (global as any).chrome = createChromeStub();
  });

  test("getItem returns null for a key that was never set", async () => {
    expect(await chromeStorageAdapter.getItem("missing")).toBeNull();
  });

  test("setItem then getItem round-trips the value", async () => {
    await chromeStorageAdapter.setItem("session", "the-token");
    expect(await chromeStorageAdapter.getItem("session")).toBe("the-token");
  });

  test("removeItem clears a previously set value", async () => {
    await chromeStorageAdapter.setItem("session", "the-token");
    await chromeStorageAdapter.removeItem("session");
    expect(await chromeStorageAdapter.getItem("session")).toBeNull();
  });
});
