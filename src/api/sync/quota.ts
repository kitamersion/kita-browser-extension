import { logger } from "@kitamersion/kita-logging";
import { getSupabaseClient } from "./supabaseClient";
import { QuotaInfo } from "@/types/integrations/sync";

type QuotaRow = {
  current_bytes: number;
  last_synced_at: string;
  plans: { max_bytes: number; data_retention_days: number };
};

export const getQuotaUsage = async (): Promise<QuotaInfo | null> => {
  const { data, error } = await getSupabaseClient()
    .from("user_quotas")
    .select<string, QuotaRow>("current_bytes, last_synced_at, plans(max_bytes, data_retention_days)")
    .maybeSingle();
  // A failed read (missing grant, expired session, network) would otherwise be indistinguishable
  // from "no quota row" — a blank quota panel with nothing to debug. Surface it in the logs, but
  // keep returning null so callers don't need to handle a new failure mode.
  if (error) logger.error(`getQuotaUsage error: ${error.message}`);
  if (!data) return null;
  return {
    currentBytes: data.current_bytes,
    maxBytes: data.plans.max_bytes,
    lastSyncedAt: new Date(data.last_synced_at).getTime(),
    dataRetentionDays: data.plans.data_retention_days,
  };
};
