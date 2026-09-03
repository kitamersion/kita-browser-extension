import { setApplicationEnabled, setContentScriptEnabled } from "./index";

const createChromeStub = () => {
  const store: Record<string, any> = {};
  return {
    storage: {
      local: {
        get: (key: string, callback: (data: any) => void) => {
          callback({ [key]: store[key] });
        },
        set: (data: Record<string, any>, callback: () => void) => {
          Object.assign(store, data);
          callback();
        },
      },
    },
    runtime: {
      lastError: undefined,
    },
    action: {
      setIcon: jest.fn(),
      setTitle: jest.fn(),
    },
    tabs: {
      query: jest.fn((_query: unknown, callback: (tabs: unknown[]) => void) => callback([])),
      sendMessage: jest.fn(),
    },
  };
};

let chromeStub: ReturnType<typeof createChromeStub>;

beforeEach(() => {
  chromeStub = createChromeStub();
  (global as any).chrome = chromeStub;
});

describe("setApplicationEnabled", () => {
  test("does not touch the extension icon - it only tracks whether the DB/app has finished initializing", async () => {
    await new Promise<void>((resolve) => setApplicationEnabled(true, () => resolve()));

    expect(chromeStub.action.setIcon).not.toHaveBeenCalled();
  });
});

describe("setContentScriptEnabled", () => {
  test("is the only thing that updates the extension icon, since it's the actual user-facing power toggle", async () => {
    await new Promise<void>((resolve) => setContentScriptEnabled(false, () => resolve()));

    expect(chromeStub.action.setIcon).toHaveBeenCalledWith({ path: "/icons/disabled/icon32.png" });
  });
});
