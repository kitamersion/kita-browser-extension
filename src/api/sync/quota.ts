import { logger } from "@kitamersion/kita-logging";
import { getSupabaseClient } from "./supabaseClient";
import { QuotaInfo } from "@/types/integrations/sync";

export const getQuotaUsage = async (): Promise<QuotaInfo | null> => {
  const { data, error } = await getSupabaseClient().from("user_quotas").select("current_bytes, max_bytes").maybeSingle();
  // A failed read (missing grant, expired session, network) would otherwise be indistinguishable
  // from "no quota row" — a blank quota panel with nothing to debug. Surface it in the logs, but
  // keep returning null so callers don't need to handle a new failure mode.
  if (error) logger.error(`getQuotaUsage error: ${error.message}`);
  if (!data) return null;
  return { currentBytes: data.current_bytes, maxBytes: data.max_bytes };
};
