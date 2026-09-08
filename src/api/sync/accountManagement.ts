import { logger } from "@kitamersion/kita-logging";
import { getSupabaseClient } from "./supabaseClient";

export const deleteAllData = async (): Promise<{ error: string | null }> => {
  const { error } = await getSupabaseClient().rpc("delete_own_data");
  if (error) logger.error(`deleteAllData error: ${error.message}`);
  return { error: error?.message ?? null };
};

export const deleteAccount = async (): Promise<{ error: string | null }> => {
  const { error } = await getSupabaseClient().rpc("delete_own_account");
  if (error) logger.error(`deleteAccount error: ${error.message}`);
  return { error: error?.message ?? null };
};
