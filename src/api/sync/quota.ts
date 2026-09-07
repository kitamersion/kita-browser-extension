import { getSupabaseClient } from "./supabaseClient";
import { QuotaInfo } from "@/types/integrations/sync";

export const getQuotaUsage = async (): Promise<QuotaInfo | null> => {
  const { data } = await getSupabaseClient().from("user_quotas").select("current_bytes, max_bytes").maybeSingle();
  if (!data) return null;
  return { currentBytes: data.current_bytes, maxBytes: data.max_bytes };
};
