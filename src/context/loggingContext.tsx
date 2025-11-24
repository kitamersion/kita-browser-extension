import { config } from "@kitamersion/kita-logging";
import React, { createContext, useContext, useEffect, useState, useMemo, PropsWithChildren, useCallback } from "react";

type LoggerConfigContextType = {
  logPrefix: string;
  logRetentionDays: number;
  setLogPrefix: (prefix: string) => Promise<void>;
  setLogRetentionDays: (days: number) => Promise<void>;
};

const LoggerConfigContext = createContext<LoggerConfigContextType | undefined>(undefined);

export const useLoggerConfig = () => {
  const context = useContext(LoggerConfigContext);
  if (!context) {
    throw new Error("useLoggerConfig must be used within a LoggerProvider");
  }
  return context;
};

export const LoggerProvider = ({ children }: PropsWithChildren<object>) => {
  const [logPrefix, setLogPrefixState] = useState("");
  const [logRetentionDays, setLogRetentionDaysState] = useState(7);

  const loadConfig = useCallback(async () => {
    const cfg = await config.viewCurrentConfigurations();

    let prefix = cfg.logPrefix;
    if (!prefix || prefix.trim() === "") {
      prefix = "[KITA_BROWSER]";
      await config.setLogPrefix(prefix);
    }
    setLogPrefixState(prefix);

    let days = cfg.logRetentionDays;
    if (!days || days <= 0) {
      days = 1;
      await config.setLogRetentionDays(days);
    }
    setLogRetentionDaysState(days);
  }, []);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const setLogPrefix = async (prefix: string) => {
    await config.setLogPrefix(prefix);
    setLogPrefixState(prefix);
  };
  const setLogRetentionDays = async (days: number) => {
    await config.setLogRetentionDays(days);
    setLogRetentionDaysState(days);
  };

  const contextValue = useMemo(() => ({ logPrefix, logRetentionDays, setLogPrefix, setLogRetentionDays }), [logPrefix, logRetentionDays]);

  return <LoggerConfigContext.Provider value={contextValue}>{children}</LoggerConfigContext.Provider>;
};
