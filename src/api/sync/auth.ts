import { getSupabaseClient } from "./supabaseClient";

export const EMAIL_CONFIRM_REDIRECT_URL = "https://www.kitamersion.com/auth/confirm/";

export const signUp = async (email: string, password: string): Promise<{ error: string | null; needsEmailConfirmation: boolean }> => {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: EMAIL_CONFIRM_REDIRECT_URL },
  });
  return { error: error?.message ?? null, needsEmailConfirmation: !error && !data?.session };
};

export const setSession = async (accessToken: string, refreshToken: string): Promise<{ error: string | null }> => {
  const { error } = await getSupabaseClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
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
