import React, { createContext, useCallback, useContext, useEffect, useState, PropsWithChildren } from "react";
import { getSession, signIn as apiSignIn, signOut as apiSignOut, signUp as apiSignUp } from "@/api/sync/auth";
import { getQuotaUsage } from "@/api/sync/quota";
import { QuotaInfo } from "@/types/integrations/sync";
import IndexedDB from "@/db/index";
import { useToastContext } from "@/context/toastNotificationContext";

export const CONFIRMATION_POLL_INTERVAL_MS = 3000;

type SyncContextType = {
  isInitialized: boolean;
  isSignedIn: boolean;
  email: string | null;
  quota: QuotaInfo | null;
  lastSyncedAt: number;
  error: string | null;
  isSubmitting: boolean;
  pendingConfirmationEmail: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSyncContext must be used within a SyncProvider");
  return context;
};

export const SyncProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { showToast } = useToastContext();
  const [isInitialized, setIsInitialized] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const session = await getSession();
    setEmail(session.email);
    setQuota(session.userId ? await getQuotaUsage() : null);
    setLastSyncedAt(await IndexedDB.getLastSyncedAt());
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsInitialized(true));
  }, [refresh]);

  const signUp = useCallback(
    async (signUpEmail: string, password: string) => {
      setIsSubmitting(true);
      const { error: signUpError, needsEmailConfirmation } = await apiSignUp(signUpEmail, password);
      setError(signUpError);
      setIsSubmitting(false);

      if (signUpError) {
        showToast({ title: "Sign up failed", status: "error", description: signUpError });
        return;
      }

      if (needsEmailConfirmation) {
        setPendingConfirmationEmail(signUpEmail);
        showToast({
          title: "Account created",
          status: "success",
          description: "Check your email for a confirmation code.",
          duration: 5000,
        });
        return;
      }

      await refresh();
      showToast({ title: "Account created", status: "success" });
    },
    [refresh, showToast]
  );

  useEffect(() => {
    if (!pendingConfirmationEmail) return;

    const intervalId = setInterval(refresh, CONFIRMATION_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [pendingConfirmationEmail, refresh]);

  useEffect(() => {
    if (pendingConfirmationEmail && email) {
      setPendingConfirmationEmail(null);
      showToast({ title: "Signed in", status: "success" });
    }
  }, [email, pendingConfirmationEmail, showToast]);

  const signIn = useCallback(
    async (signInEmail: string, password: string) => {
      setIsSubmitting(true);
      const { error: signInError } = await apiSignIn(signInEmail, password);
      setError(signInError);
      setIsSubmitting(false);

      if (signInError) {
        showToast({ title: "Sign in failed", status: "error", description: signInError });
        return;
      }

      await refresh();
      showToast({ title: "Signed in", status: "success" });
    },
    [refresh, showToast]
  );

  const signOut = useCallback(async () => {
    await apiSignOut();
    setError(null);
    await refresh();
    showToast({ title: "Signed out", status: "success" });
  }, [refresh, showToast]);

  return (
    <SyncContext.Provider
      value={{
        isInitialized,
        isSignedIn: !!email,
        email,
        quota,
        lastSyncedAt,
        error,
        isSubmitting,
        pendingConfirmationEmail,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};
