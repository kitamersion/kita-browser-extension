import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { chromeStorageAdapter } from "./chromeStorageAdapter";

let client: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (client) return client;

  client = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string, {
    db: {
      schema: "kitamersion", // every .from() call on this client targets kitamersion, not public
    },
    auth: {
      storage: chromeStorageAdapter,
      autoRefreshToken: false, // no persistent timer in a service worker; refresh happens on-demand per call
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
};
