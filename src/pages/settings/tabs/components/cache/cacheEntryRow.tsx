import React, { useState } from "react";
import { Avatar, Badge, Box, Button, HStack, Image, Progress, Text, VStack } from "@chakra-ui/react";
import { formatDistanceToNow } from "date-fns";
import { AniListCacheCategory, AniListCacheEntry } from "@/api/anilistCache";
import { CacheExpiryStatus, formatBytes, getExpiryStatus, getRemainingPercent } from "./cacheFormatting";
import { getCachePreview } from "./cachePreview";
import JsonViewer from "./jsonViewer";

const STATUS_COLOR: Record<CacheExpiryStatus, string> = {
  fresh: "green",
  expiring: "orange",
  expired: "red",
};

interface CacheEntryRowProps {
  category: AniListCacheCategory;
  entry: AniListCacheEntry;
  onDelete: (key: string) => Promise<void>;
  onRefresh?: (key: string) => Promise<void>;
}

const CacheEntryRow: React.FC<CacheEntryRowProps> = ({ category, entry, onDelete, onRefresh }) => {
  const [showJson, setShowJson] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const preview = getCachePreview(category, entry.key, entry.value);
  const status = getExpiryStatus(entry);
  const remainingPercent = getRemainingPercent(entry);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(entry.key);
    setIsDeleting(false);
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    await onRefresh(entry.key);
    setIsRefreshing(false);
  };

  return (
    <Box borderTop="1px solid" borderColor="border.secondary" py={3} data-testid={`cache-entry-${entry.key}`}>
      <HStack justify="space-between" align="flex-start">
        <HStack align="flex-start" spacing={3}>
          {preview.imageUrl ? (
            <Image src={preview.imageUrl} boxSize="40px" objectFit="cover" borderRadius="md" alt="" />
          ) : (
            <Avatar size="sm" name={preview.title} />
          )}
          <VStack align="flex-start" spacing={0}>
            <Text color="text.primary" fontWeight="medium">
              {preview.title}
            </Text>
            {preview.subtitle && (
              <Text color="text.secondary" fontSize="sm">
                {preview.subtitle}
              </Text>
            )}
            <HStack spacing={2}>
              <Text color="text.tertiary" fontSize="xs">
                {entry.created_at ? `cached ${formatDistanceToNow(entry.created_at, { addSuffix: true })}` : "cached at unknown time"}
              </Text>
              <Badge colorScheme={STATUS_COLOR[status]}>{status}</Badge>
              <Text color="text.tertiary" fontSize="xs">
                {formatBytes(entry.sizeBytes)}
              </Text>
            </HStack>
            {remainingPercent !== null && (
              <Progress
                value={remainingPercent}
                size="xs"
                width="120px"
                colorScheme={STATUS_COLOR[status]}
                bg="bg.tertiary"
                rounded="full"
              />
            )}
          </VStack>
        </HStack>
        <HStack>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setShowJson((open) => !open)}
            data-testid={`cache-entry-toggle-json-${entry.key}`}
          >
            {showJson ? "Hide JSON" : "View raw JSON"}
          </Button>
          {onRefresh && (
            <Button size="xs" onClick={handleRefresh} isLoading={isRefreshing} data-testid={`cache-entry-refresh-${entry.key}`}>
              Refresh
            </Button>
          )}
          <Button
            size="xs"
            colorScheme="red"
            variant="outline"
            onClick={handleDelete}
            isLoading={isDeleting}
            data-testid={`cache-entry-delete-${entry.key}`}
          >
            Delete
          </Button>
        </HStack>
      </HStack>
      {showJson && (
        <Box mt={2} bg="bg.tertiary" borderRadius="md" p={2}>
          <JsonViewer value={entry.value} />
        </Box>
      )}
    </Box>
  );
};

export default CacheEntryRow;
