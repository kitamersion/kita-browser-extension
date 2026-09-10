jest.mock("./supabaseClient", () => ({ getSupabaseClient: jest.fn() }));
jest.mock("@kitamersion/kita-logging", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { logger } from "@kitamersion/kita-logging";
import { getSupabaseClient } from "./supabaseClient";
import { getQuotaUsage } from "./quota";

describe("getQuotaUsage", () => {
  test("returns the current/max bytes and retention info for the signed-in user", async () => {
    (getSupabaseClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            current_bytes: 1234,
            last_synced_at: "2026-09-01T00:00:00.000Z",
            plans: { max_bytes: 5242880, data_retention_days: 90 },
          },
          error: null,
        }),
      }),
    });

    expect(await getQuotaUsage()).toEqual({
      currentBytes: 1234,
      maxBytes: 5242880,
      lastSyncedAt: new Date("2026-09-01T00:00:00.000Z").getTime(),
      dataRetentionDays: 90,
    });
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
