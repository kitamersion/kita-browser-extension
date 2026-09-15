import { formatBytes, getExpiryStatus, getRemainingPercent } from "./cacheFormatting";

describe("formatBytes", () => {
  test("formats sub-1KB values in bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  test("formats sub-1MB values in KB", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  test("formats values at or above 1MB in MB", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });
});

describe("getExpiryStatus", () => {
  test("returns expired once now passes expires_at", () => {
    expect(getExpiryStatus({ created_at: 0, expires_at: 1000 }, 1000)).toBe("expired");
  });

  test("returns expiring when less than 20% of the TTL remains", () => {
    // created 1000ms ago, 10-minute TTL, 1 minute (10%) left
    const created_at = 0;
    const expires_at = 600_000;
    const now = expires_at - 60_000;
    expect(getExpiryStatus({ created_at, expires_at }, now)).toBe("expiring");
  });

  test("returns fresh when well within the TTL", () => {
    expect(getExpiryStatus({ created_at: 0, expires_at: 600_000 }, 10_000)).toBe("fresh");
  });

  test("falls back to fresh when created_at is missing and the entry hasn't expired", () => {
    expect(getExpiryStatus({ expires_at: 600_000 }, 10_000)).toBe("fresh");
  });
});

describe("getRemainingPercent", () => {
  test("returns null when created_at is missing", () => {
    expect(getRemainingPercent({ expires_at: 600_000 }, 10_000)).toBeNull();
  });

  test("returns 100 right after creation and 0 at expiry", () => {
    expect(getRemainingPercent({ created_at: 0, expires_at: 1000 }, 0)).toBe(100);
    expect(getRemainingPercent({ created_at: 0, expires_at: 1000 }, 1000)).toBe(0);
  });
});
