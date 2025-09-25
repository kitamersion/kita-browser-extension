import React, { useEffect, useState } from "react";
import {
  TabPanel,
  Heading,
  Flex,
  Box,
  Input,
  NumberInput,
  NumberInputField,
  Button,
  VStack,
  HStack,
  Text,
  Divider,
  useToast,
  Select,
  Badge,
  Spacer,
  IconButton,
} from "@chakra-ui/react";
import { DownloadIcon, RepeatIcon } from "@chakra-ui/icons";
import LoadingState from "@/components/states/LoadingState";
import { LogEntry } from "@kitamersion/kita-logging/lib/types";
import { config, logger, history } from "@kitamersion/kita-logging";

type RawLog = {
  id: string;
  level: string;
  message: string;
  prefix?: string;
  timestamp?: number;
  timestampISO?: string;
};

const levelColor = (level: string) => {
  switch ((level || "").toLowerCase()) {
    case "error":
      return "red";
    case "warn":
      return "orange";
    case "debug":
      return "purple";
    default:
      return "green";
  }
};

const formatWhen = (log: RawLog) => {
  if (log.timestampISO) return new Date(log.timestampISO).toLocaleString();
  if (log.timestamp) return new Date(log.timestamp).toLocaleString();
  return "-";
};

const LogsTab: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<RawLog[]>([]);
  const [prefix, setPrefix] = useState("");
  const [retention, setRetention] = useState<number>(7);
  const [pageSize, setPageSize] = useState<number>(50);

  const loadConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await config.viewCurrentConfigurations();
      setPrefix(cfg.logPrefix || "");
      setRetention(cfg.logRetentionDays || 7);
    } catch (err) {
      logger?.error?.(`Error loading logger config: ${err}`);
      toast({ title: "Failed to load logger config", status: "error", duration: 2500 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const all = await history.getLogs();
      // newest-first already; just slice for pageSize
      const normalized = (all || []).map((l: LogEntry) => ({
        id: l.id,
        level: l.level,
        message: l.message,
        prefix: l.prefix,
        timestamp: typeof l.timestamp === "number" ? l.timestamp : undefined,
        timestampISO: l.timestampISO || (typeof l.timestamp === "number" ? new Date(l.timestamp).toISOString() : undefined),
      }));
      setLogs(normalized.slice(0, pageSize));
    } catch (err) {
      logger.error(`Error loading logs: ${err}`);
      toast({ title: "Failed to load logs", status: "error", duration: 2500 });
    } finally {
      setLoading(false);
    }
  }, [pageSize, toast]);

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, [loadLogs, loadConfig]);

  const saveConfig = async () => {
    try {
      await config.setLogPrefix(prefix);
      await config.setLogRetentionDays(retention);
      toast({ title: "Logger config saved", status: "success", duration: 2500 });
      // refresh runtime logger prefix if provided by API
      if (typeof (logger as any).refresh === "function") await (logger as any).refresh();
    } catch (err) {
      toast({ title: "Failed to save config", status: "error", duration: 2500 });
    }
  };

  const flushBuffer = async () => {
    try {
      await (logger as any).flush?.();
      toast({ title: "Logger flushed", status: "success", duration: 1500 });
      await loadLogs();
    } catch (err) {
      toast({ title: "Flush failed", status: "error", duration: 2500 });
    }
  };

  const refreshRuntime = async () => {
    try {
      await (logger as any).refresh?.();
      toast({ title: "Logger refreshed", status: "success", duration: 1500 });
      await loadConfig();
    } catch (err) {
      toast({ title: "Refresh failed", status: "error", duration: 2500 });
    }
  };

  const exportLogs = async () => {
    try {
      const all = await history.getLogs();
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kita-logs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Export started", status: "success", duration: 2000 });
    } catch (err) {
      toast({ title: "Export failed", status: "error", duration: 2500 });
    }
  };

  const deleteExpired = async () => {
    try {
      await history.deleteExpiredLogs(retention);
      await loadLogs();
      toast({ title: "Expired logs deleted", status: "success", duration: 2000 });
    } catch (err) {
      toast({ title: "Delete expired failed", status: "error", duration: 2500 });
    }
  };

  const deleteAllLogs = async () => {
    try {
      await history.deleteAllLogs();
      await loadLogs();
      toast({ title: "Deleted all logs", status: "success", duration: 2500 });
    } catch (err) {
      toast({ title: "Failed to delete logs", status: "error", duration: 2500 });
    }
  };

  return (
    <TabPanel bg="bg.primary" color="text.primary">
      {loading ? (
        <LoadingState />
      ) : (
        <VStack alignItems="stretch" gap={6}>
          <Flex alignItems="center" gap={4}>
            <Heading as="h2" size="md" color="text.primary">
              Kita Logging
            </Heading>
            <Text color="text.secondary">View and manage application logs</Text>
            <Spacer />
            <HStack>
              <IconButton aria-label="flush" title="Flush buffer" icon={<RepeatIcon />} onClick={flushBuffer} />
              <Button leftIcon={<DownloadIcon />} onClick={exportLogs} colorScheme="blue">
                Export
              </Button>
            </HStack>
          </Flex>

          <Box>
            <Heading as="h3" size="sm" mb={2}>
              Configuration
            </Heading>
            <Flex gap={2} alignItems="center">
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Log prefix" />
              <NumberInput max={365} min={1} value={retention} onChange={(valueString) => setRetention(Number(valueString))} width="120px">
                <NumberInputField />
              </NumberInput>
              <Button colorScheme="green" onClick={saveConfig}>
                Save
              </Button>
              <Button onClick={refreshRuntime} colorScheme="gray">
                Refresh
              </Button>
              <Button onClick={deleteExpired} colorScheme="orange">
                Purge expired
              </Button>
              <Button onClick={deleteAllLogs} colorScheme="red">
                Delete all
              </Button>
            </Flex>
          </Box>

          <Divider />

          <Box>
            <Heading as="h3" size="sm" mb={2}>
              Recent Logs
            </Heading>
            <HStack>
              <Text color="text.secondary">Page size:</Text>
              <Select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} width="120px">
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Select>
              <Button onClick={loadLogs} colorScheme="green">
                Refresh
              </Button>
            </HStack>

            <VStack align="stretch" spacing={3} mt={4}>
              {logs.length === 0 && <Text color="text.secondary">No logs found.</Text>}
              {logs.map((l) => (
                <Box key={l.id} p={3} bg="bg.secondary" borderRadius={8} boxShadow="sm">
                  <Flex alignItems="center" gap={3}>
                    <Badge colorScheme={levelColor(l.level)}>{l.level.toUpperCase()}</Badge>
                    <Text color="text.primary" fontWeight="bold" fontSize="sm">
                      {l.prefix ?? ""}
                    </Text>
                    <Text color="text.primary" fontWeight="bold" flex="1">
                      {l.message}
                    </Text>
                    <Text color="text.secondary" fontSize="sm" whiteSpace="nowrap">
                      {formatWhen(l)}
                    </Text>
                  </Flex>
                </Box>
              ))}
            </VStack>
          </Box>
        </VStack>
      )}
    </TabPanel>
  );
};

export default LogsTab;
