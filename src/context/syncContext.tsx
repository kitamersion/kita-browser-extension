import React, { createContext, useCallback, useContext, useEffect, useState, PropsWithChildren } from "react";
import { getSession, signIn as apiSignIn, signOut as apiSignOut, signUp as apiSignUp } from "@/api/sync/auth";
import { deleteAllData as apiDeleteAllData, deleteAccount as apiDeleteAccount } from "@/api/sync/accountManagement";
import { getQuotaUsage } from "@/api/sync/quota";
import { runSync } from "@/api/sync/syncEngine";
import { getNextSyncTime } from "@/pages/background/syncAlarm";
import { settingsManager } from "@/api/settings/manager";
import { SETTINGS, SyncStats } from "@/api/settings/definitions";
import { QuotaInfo } from "@/types/integrations/sync";
import IndexedDB from "@/db/index";
import { useToastContext } from "@/context/toastNotificationContext";
import eventBus from "@/api/eventbus";
import { VIDEO_REFRESH, TAG_REFRESH, VIDEO_TAG_RELATIONSHIP_REFRESH, AUTO_TAG_REFRESH } from "@/data/events";

export const CONFIRMATION_POLL_INTERVAL_MS = 3000;

type SyncContextType = {
  isInitialized: boolean;
  isSignedIn: boolean;
  email: string | null;
  quota: QuotaInfo | null;
  lastSyncedAt: number;
  nextSyncAt: number | null;
  lastSyncStats: SyncStats | null;
  error: string | null;
  isSubmitting: boolean;
  isSyncing: boolean;
  pendingConfirmationEmail: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  isKitaSyncPaused: boolean;
  pauseKitaSync: () => Promise<void>;
  resumeKitaSync: () => Promise<void>;
  deleteAllData: () => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
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
  const [nextSyncAt, setNextSyncAt] = useState<number | null>(null);
  const [lastSyncStats, setLastSyncStats] = useState<SyncStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [isKitaSyncPaused, setIsKitaSyncPaused] = useState(false);

  const refresh = useCallback(async () => {
    if (await settingsManager.get(SETTINGS.kitaSync.pendingRekeyNotice)) {
      await settingsManager.set(SETTINGS.kitaSync.pendingRekeyNotice, false);
      showToast({
        title: "Signed in as a different account",
        status: "warning",
        description: "Your local data will sync as new to this account.",
      });
    }

    const session = await getSession();
    setEmail(session.email);
    setQuota(session.userId ? await getQuotaUsage() : null);
    setLastSyncedAt(await IndexedDB.getLastSyncedAt());
    setNextSyncAt(await getNextSyncTime());
    setIsKitaSyncPaused(await settingsManager.get(SETTINGS.kitaSync.paused));
    setLastSyncStats(await settingsManager.get(SETTINGS.kitaSync.lastSyncStats));
  }, [showToast]);

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

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    const result = await runSync();
    setIsSyncing(false);

    if (result.rekeyed) {
      showToast({
        title: "Signed in as a different account",
        status: "warning",
        description: "Your local data will sync as new to this account.",
      });
    }
    await settingsManager.set(SETTINGS.kitaSync.pendingRekeyNotice, false);

    if (result.status === "quota-exceeded") {
      showToast({ title: "Storage quota exceeded", status: "error", description: "Free up space to resume syncing." });
      return;
    }

    if (result.status === "error") {
      showToast({ title: "Sync failed", status: "error", description: result.message });
      return;
    }

    if (result.status === "paused") {
      showToast({ title: "Kita Sync is paused", status: "warning", description: "Resume Kita Sync to sync again." });
      return;
    }

    // Sync writes straight to IndexedDB, bypassing every data context's in-memory cache. Without
    // this, tags/relationships/auto-tags (and videos wherever read from a cached context) sit stale
    // until the whole page is manually reloaded.
    eventBus.publish(VIDEO_REFRESH, { message: "sync complete", value: {} });
    eventBus.publish(TAG_REFRESH, { message: "sync complete", value: {} });
    eventBus.publish(VIDEO_TAG_RELATIONSHIP_REFRESH, { message: "sync complete", value: {} });
    eventBus.publish(AUTO_TAG_REFRESH, { message: "sync complete", value: {} });

    await refresh();
    showToast({ title: "Sync complete", status: "success" });
  }, [refresh, showToast]);

  const pauseKitaSync = useCallback(async () => {
    await settingsManager.set(SETTINGS.kitaSync.paused, true);
    setIsKitaSyncPaused(true);
    showToast({ title: "Kita Sync paused", status: "success" });
  }, [showToast]);

  const resumeKitaSync = useCallback(async () => {
    await settingsManager.set(SETTINGS.kitaSync.paused, false);
    setIsKitaSyncPaused(false);
    showToast({ title: "Kita Sync resumed", status: "success" });
  }, [showToast]);

  const deleteAllData = useCallback(async () => {
    const { error: deleteError } = await apiDeleteAllData();
    if (deleteError) {
      showToast({ title: "Failed to delete data", status: "error", description: deleteError });
      return { error: deleteError };
    }

    await settingsManager.set(SETTINGS.kitaSync.paused, true);
    await refresh();
    showToast({ title: "All data deleted", status: "success", description: "Kita Sync has been paused." });
    return { error: null };
  }, [refresh, showToast]);

  const deleteAccount = useCallback(async () => {
    const { error: deleteError } = await apiDeleteAccount();
    if (deleteError) {
      showToast({ title: "Failed to delete account", status: "error", description: deleteError });
      return { error: deleteError };
    }

    await apiSignOut();
    setError(null);
    await refresh();
    showToast({ title: "Account deleted", status: "success" });
    return { error: null };
  }, [refresh, showToast]);

  return (
    <SyncContext.Provider
      value={{
        isInitialized,
        isSignedIn: !!email,
        email,
        quota,
        lastSyncedAt,
        nextSyncAt,
        lastSyncStats,
        error,
        isSubmitting,
        isSyncing,
        pendingConfirmationEmail,
        signUp,
        signIn,
        signOut,
        syncNow,
        isKitaSyncPaused,
        pauseKitaSync,
        resumeKitaSync,
        deleteAllData,
        deleteAccount,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};
