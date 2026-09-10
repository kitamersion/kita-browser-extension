export type SyncRow = {
  id: string;
  updated_at: number;
  deleted_at?: number | null;
  [key: string]: unknown;
};

export type QuotaInfo = {
  currentBytes: number;
  maxBytes: number;
  lastSyncedAt: number;
  dataRetentionDays: number;
};
