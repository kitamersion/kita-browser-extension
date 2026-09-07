import { getSupabaseClient } from "./supabaseClient";

export const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
  const { error } = await getSupabaseClient().auth.signUp({ email, password });
  return { error: error?.message ?? null };
};

export const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
  const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
};

export const signOut = async (): Promise<void> => {
  await getSupabaseClient().auth.signOut();
};

export const getSession = async (): Promise<{ email: string | null; userId: string | null }> => {
  const { data } = await getSupabaseClient().auth.getSession();
  return {
    email: data.session?.user?.email ?? null,
    userId: data.session?.user?.id ?? null,
  };
};
