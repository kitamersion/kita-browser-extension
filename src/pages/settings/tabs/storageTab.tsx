import React, { useEffect, useState } from "react";
import { Alert, AlertIcon, Box, Heading, HStack, Progress, Stat, StatLabel, StatNumber, Text, VStack } from "@chakra-ui/react";
import { getStorageUsageSummary, StorageUsageSummary } from "@/api/storageUsage";
import { formatBytes } from "./components/cache/cacheFormatting";

const StorageTab: React.FC = () => {
  const [summary, setSummary] = useState<StorageUsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setHasError(false);
    getStorageUsageSummary()
      .then((result) => {
        if (isMounted) setSummary(result);
      })
      .catch(() => {
        if (isMounted) setHasError(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <VStack spacing={4} align="stretch" mb={4}>
        <Heading size="lg" color="accent.primary">
          Storage
        </Heading>
        <Text color="text.secondary" fontSize="sm">
          How much data Kita has stored on this device, broken down by feature area.
        </Text>
      </VStack>

      {isLoading && <Text color="text.secondary">Loading…</Text>}

      {!isLoading && hasError && (
        <Alert status="error" variant="kita" data-testid="storage-error">
          <AlertIcon />
          Failed to load storage usage.
        </Alert>
      )}

      {!isLoading && !hasError && summary && (
        <VStack align="stretch" spacing={4}>
          <Box bg="bg.secondary" border="1px solid" borderColor="border.primary" borderRadius="xl" p={4}>
            <Stat>
              <StatLabel color="text.secondary">Total storage used</StatLabel>
              <StatNumber color="text.primary" data-testid="storage-total">
                {formatBytes(summary.totalBytes)}
              </StatNumber>
            </Stat>
          </Box>

          <VStack align="stretch" spacing={3}>
            {summary.buckets.map((bucket) => {
              const percent = summary.totalBytes > 0 ? (bucket.bytes / summary.totalBytes) * 100 : 0;
              return (
                <Box
                  key={bucket.name}
                  as="section"
                  bg="bg.secondary"
                  border="1px solid"
                  borderColor="border.primary"
                  rounded="lg"
                  p={4}
                  data-testid={`storage-bucket-${bucket.name}`}
                >
                  <HStack justify="space-between" mb={2}>
                    <Text color="text.primary" fontWeight="medium">
                      {bucket.name}
                    </Text>
                    <Text color="text.secondary" fontSize="sm">
                      {formatBytes(bucket.bytes)}
                    </Text>
                  </HStack>
                  <Progress value={percent} size="xs" colorScheme="red" bg="bg.tertiary" rounded="full" />
                </Box>
              );
            })}
          </VStack>
        </VStack>
      )}
    </>
  );
};

export default StorageTab;
