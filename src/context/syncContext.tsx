import React, { createContext, useCallback, useContext, useEffect, useState, PropsWithChildren } from "react";
import { getSession, signIn as apiSignIn, signOut as apiSignOut, signUp as apiSignUp } from "@/api/sync/auth";
import { getQuotaUsage } from "@/api/sync/quota";
import { QuotaInfo } from "@/types/integrations/sync";
import IndexedDB from "@/db/index";

type SyncContextType = {
  isInitialized: boolean;
  isSignedIn: boolean;
  email: string | null;
  quota: QuotaInfo | null;
  lastSyncedAt: number;
  error: string | null;
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
      const { error: signUpError } = await apiSignUp(signUpEmail, password);
      setError(signUpError);
      if (!signUpError) await refresh();
    },
    [refresh]
  );

  const signIn = useCallback(
    async (signInEmail: string, password: string) => {
      const { error: signInError } = await apiSignIn(signInEmail, password);
      setError(signInError);
      if (!signInError) await refresh();
    },
    [refresh]
  );

  const signOut = useCallback(async () => {
    await apiSignOut();
    setError(null);
    await refresh();
  }, [refresh]);

  return (
    <SyncContext.Provider value={{ isInitialized, isSignedIn: !!email, email, quota, lastSyncedAt, error, signUp, signIn, signOut }}>
      {children}
    </SyncContext.Provider>
  );
};
