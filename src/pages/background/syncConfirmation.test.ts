jest.mock("@/api/sync/auth", () => ({ setSession: jest.fn() }));

import { setSession } from "@/api/sync/auth";
import { handleSyncEmailConfirmed } from "./syncConfirmation";

describe("handleSyncEmailConfirmed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("establishes a session from the access and refresh tokens in the payload", async () => {
    (setSession as jest.Mock).mockResolvedValue({ error: null });

    const response = await handleSyncEmailConfirmed(JSON.stringify({ accessToken: "access-token", refreshToken: "refresh-token" }));

    expect(setSession).toHaveBeenCalledWith("access-token", "refresh-token");
    expect(response).toEqual({ status: "success", message: "session established" });
  });

  test("returns an error response when setSession fails", async () => {
    (setSession as jest.Mock).mockResolvedValue({ error: "Invalid refresh token" });

    const response = await handleSyncEmailConfirmed(JSON.stringify({ accessToken: "access-token", refreshToken: "bad-token" }));

    expect(response).toEqual({ status: "error", message: "Invalid refresh token" });
  });

  test("returns an error response when the payload is malformed", async () => {
    const response = await handleSyncEmailConfirmed("not-json");

    expect(setSession).not.toHaveBeenCalled();
    expect(response).toEqual({ status: "error", message: "error parsing payload" });
  });
});
