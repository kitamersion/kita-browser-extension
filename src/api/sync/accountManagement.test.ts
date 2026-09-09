jest.mock("./supabaseClient", () => ({ getSupabaseClient: jest.fn() }));
jest.mock("@kitamersion/kita-logging", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { logger } from "@kitamersion/kita-logging";
import { getSupabaseClient } from "./supabaseClient";
import { deleteAllData, deleteAccount, purgeExpiredTombstones } from "./accountManagement";

describe("deleteAllData", () => {
  test("calls the delete_own_data RPC and returns no error on success", async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

    expect(await deleteAllData()).toEqual({ error: null });
    expect(rpc).toHaveBeenCalledWith("delete_own_data");
  });

  test("logs and returns the error message when the RPC fails", async () => {
    const rpc = jest.fn().mockResolvedValue({ error: { message: "permission denied" } });
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

    expect(await deleteAllData()).toEqual({ error: "permission denied" });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("permission denied"));
  });
});

describe("deleteAccount", () => {
  test("calls the delete_own_account RPC and returns no error on success", async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

    expect(await deleteAccount()).toEqual({ error: null });
    expect(rpc).toHaveBeenCalledWith("delete_own_account");
  });

  test("logs and returns the error message when the RPC fails", async () => {
    const rpc = jest.fn().mockResolvedValue({ error: { message: "permission denied" } });
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

    expect(await deleteAccount()).toEqual({ error: "permission denied" });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("permission denied"));
  });
});

describe("purgeExpiredTombstones", () => {
  test("calls the purge_expired_tombstones RPC and returns the purged count on success", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 5, error: null });
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

    expect(await purgeExpiredTombstones()).toEqual({ purgedCount: 5, error: null });
    expect(rpc).toHaveBeenCalledWith("purge_expired_tombstones");
  });

  test("logs and returns the error message when the RPC fails", async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: "permission denied" } });
    (getSupabaseClient as jest.Mock).mockReturnValue({ rpc });

    expect(await purgeExpiredTombstones()).toEqual({ purgedCount: null, error: "permission denied" });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("permission denied"));
  });
});
