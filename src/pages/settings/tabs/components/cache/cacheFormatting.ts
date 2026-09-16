export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export type CacheExpiryStatus = "fresh" | "expiring" | "expired";

interface CacheTiming {
  created_at?: number;
  expires_at: number;
}

export function getExpiryStatus(entry: CacheTiming, now: number = Date.now()): CacheExpiryStatus {
  if (now >= entry.expires_at) return "expired";

  if (entry.created_at !== undefined) {
    const totalTtl = entry.expires_at - entry.created_at;
    const remaining = entry.expires_at - now;
    if (totalTtl > 0 && remaining / totalTtl < 0.2) return "expiring";
  }

  return "fresh";
}

export function getRemainingPercent(entry: CacheTiming, now: number = Date.now()): number | null {
  if (entry.created_at === undefined) return null;

  const totalTtl = entry.expires_at - entry.created_at;
  if (totalTtl <= 0) return null;

  const remaining = entry.expires_at - now;
  return Math.max(0, Math.min(100, (remaining / totalTtl) * 100));
}
