import { SYNC_EMAIL_CONFIRMED } from "@/data/events";

const dispatchBridgeMessage = (data: unknown, origin = window.location.origin) => {
  window.dispatchEvent(new MessageEvent("message", { data, origin, source: window }));
};

describe("confirmBridge", () => {
  beforeEach(() => {
    (global as any).chrome = { runtime: { sendMessage: jest.fn() } };
    jest.resetModules();
    require("./confirmBridge");
  });

  test("forwards the access and refresh tokens to the background script", () => {
    dispatchBridgeMessage({ source: "kita-browser-confirm", accessToken: "access-token", refreshToken: "refresh-token" });

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: SYNC_EMAIL_CONFIRMED, payload: JSON.stringify({ accessToken: "access-token", refreshToken: "refresh-token" }) },
      expect.any(Function)
    );
  });

  test("ignores messages from a different origin", () => {
    dispatchBridgeMessage(
      { source: "kita-browser-confirm", accessToken: "access-token", refreshToken: "refresh-token" },
      "https://evil.example.com"
    );

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  test("ignores messages without the expected source marker", () => {
    dispatchBridgeMessage({ accessToken: "access-token", refreshToken: "refresh-token" });

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  test("ignores messages missing tokens", () => {
    dispatchBridgeMessage({ source: "kita-browser-confirm" });

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });
});
