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
  Switch,
  FormControl,
  FormLabel,
  SimpleGrid,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
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
  stack?: string;
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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<RawLog[]>([]);
  const [prefix, setPrefix] = useState("");
  const [retention, setRetention] = useState<number>(7);
  const [pageSize, setPageSize] = useState<number>(50);
  const [flushInterval, setFlushInterval] = useState<number>(2000);
  const [batchSize, setBatchSize] = useState<number>(50);
  const [maxBufferSize, setMaxBufferSize] = useState<number>(5000);
  const [persistToLocalStorage, setPersistToLocalStorage] = useState<boolean>(true);
  const [captureStack, setCaptureStack] = useState<boolean>(true);
  const [maxStackChars, setMaxStackChars] = useState<number>(2000);
  const [totalLogCount, setTotalLogCount] = useState<number>(0);

  const loadConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await config.viewCurrentConfigurations();
      const bufferedOpts = await config.getBufferedOptions();
      setPrefix(cfg.logPrefix || "");
      setRetention(cfg.logRetentionDays || 7);
      setFlushInterval(bufferedOpts.flushIntervalMs || 2000);
      setBatchSize(bufferedOpts.batchSize || 50);
      setMaxBufferSize(bufferedOpts.maxBufferSize || 5000);
      setPersistToLocalStorage(bufferedOpts.persistToLocalStorage ?? true);
      setCaptureStack(bufferedOpts.captureStack ?? true);
      setMaxStackChars(bufferedOpts.maxStackChars || 2000);
    } catch (err) {
      (logger as any)?.error?.(`Error loading logger config: ${err}`);
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
        stack: l.stack,
      }));
      setTotalLogCount(normalized.length);
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
      await config.setBufferedOptions({
        flushIntervalMs: flushInterval,
        batchSize,
        maxBufferSize,
        persistToLocalStorage,
        captureStack,
        maxStackChars,
      });
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
      onClose();
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
          <VStack spacing={4} align="stretch">
            <Heading size="lg" color="accent.primary">
              Kita Logging
            </Heading>
            <Text color="text.secondary" fontSize="sm">
              View and manage application logs
            </Text>
          </VStack>

          <Divider />

          <Box>
            <Flex alignItems="center" justifyContent="space-between">
              <Heading as="h3" size="sm" mb={2}>
                Recent Logs ({logs.length} of {totalLogCount})
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
            </Flex>

            <VStack alignItems="stretch" spacing={3} mt={2}>
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
                  {l.stack && (
                    <Text color="text.secondary" fontSize="sm" mt={2} whiteSpace="pre-wrap" bg="bg.primary" p={2} borderRadius={4}>
                      {l.stack}
                    </Text>
                  )}
                </Box>
              ))}
            </VStack>
          </Box>

          <Drawer isOpen={isOpen} onClose={onClose} size="md">
            <DrawerOverlay />
            <DrawerContent bg="bg.primary" color="text.primary">
              <DrawerHeader>Logger Settings</DrawerHeader>
              <DrawerCloseButton />
              <DrawerBody>
                <VStack align="stretch" spacing={6}>
                  <Box>
                    <Heading as="h3" size="sm" mb={2}>
                      Configuration
                    </Heading>
                    <VStack align="stretch" spacing={4}>
                      <Flex gap={4} alignItems="end">
                        <FormControl>
                          <FormLabel>Log Prefix</FormLabel>
                          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Log prefix" />
                        </FormControl>
                        <FormControl>
                          <FormLabel>Log Retention Days</FormLabel>
                          <NumberInput
                            max={365}
                            min={1}
                            value={retention}
                            onChange={(valueString) => setRetention(Number(valueString))}
                            width="140px"
                          >
                            <NumberInputField />
                          </NumberInput>
                        </FormControl>
                      </Flex>
                    </VStack>
                  </Box>

                  <Divider />

                  <Box>
                    <Heading as="h4" size="sm" mb={2}>
                      Buffered Logger Options
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel>Flush Interval (ms)</FormLabel>
                        <NumberInput
                          value={flushInterval}
                          onChange={(valueString) => setFlushInterval(Number(valueString))}
                          min={500}
                          max={10000}
                        >
                          <NumberInputField />
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Batch Size</FormLabel>
                        <NumberInput value={batchSize} onChange={(valueString) => setBatchSize(Number(valueString))} min={1} max={200}>
                          <NumberInputField />
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Max Buffer Size</FormLabel>
                        <NumberInput
                          value={maxBufferSize}
                          onChange={(valueString) => setMaxBufferSize(Number(valueString))}
                          min={100}
                          max={10000}
                        >
                          <NumberInputField />
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel>Max Stack Chars</FormLabel>
                        <NumberInput
                          value={maxStackChars}
                          onChange={(valueString) => setMaxStackChars(Number(valueString))}
                          min={100}
                          max={10000}
                        >
                          <NumberInputField />
                        </NumberInput>
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  <Divider />

                  <Box>
                    <Heading as="h4" size="sm" mb={2}>
                      Options
                    </Heading>
                    <VStack align="stretch" spacing={3}>
                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0} mr={2}>
                          Persist to LocalStorage
                        </FormLabel>
                        <Switch isChecked={persistToLocalStorage} onChange={(e) => setPersistToLocalStorage(e.target.checked)} />
                      </FormControl>
                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0} mr={2}>
                          Capture Stack
                        </FormLabel>
                        <Switch isChecked={captureStack} onChange={(e) => setCaptureStack(e.target.checked)} />
                      </FormControl>
                    </VStack>
                  </Box>

                  <Divider />

                  <Flex gap={2} wrap="wrap">
                    <Button colorScheme="green" onClick={saveConfig}>
                      Save
                    </Button>
                    <Button onClick={deleteExpired} colorScheme="orange">
                      Purge expired
                    </Button>
                    <Button onClick={deleteAllLogs} colorScheme="red">
                      Delete all
                    </Button>
                  </Flex>
                </VStack>
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        </VStack>
      )}
    </TabPanel>
  );
};

export default LogsTab;
