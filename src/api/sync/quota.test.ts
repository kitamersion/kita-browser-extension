jest.mock("./supabaseClient", () => ({ getSupabaseClient: jest.fn() }));
jest.mock("@kitamersion/kita-logging", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { logger } from "@kitamersion/kita-logging";
import { getSupabaseClient } from "./supabaseClient";
import { getQuotaUsage } from "./quota";

describe("getQuotaUsage", () => {
  test("returns the current/max bytes for the signed-in user", async () => {
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { current_bytes: 1234, quota_tiers: { max_bytes: 5242880 } }, error: null }),
      }),
    });

    expect(await getQuotaUsage()).toEqual({ currentBytes: 1234, maxBytes: 5242880 });
  });

  test("returns null when there is no quota row", async () => {
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    expect(await getQuotaUsage()).toBeNull();
  });

  test("logs the PostgREST error instead of silently returning null", async () => {
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: "permission denied for table user_quotas" } }),
      }),
    });

    expect(await getQuotaUsage()).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("permission denied for table user_quotas"));
  });
});
