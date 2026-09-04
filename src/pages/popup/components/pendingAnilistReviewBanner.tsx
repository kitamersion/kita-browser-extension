import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertIcon, Button, Flex, Text } from "@chakra-ui/react";
import { getPendingAnilistSyncs } from "@/api/integration/anilistPendingSync";
import { SETTINGS } from "@/api/settings/definitions";
import { OPEN_ANILIST_PENDING_REVIEW } from "@/data/events";
import { formatPendingSeriesSummary } from "@/utils";

const PendingAnilistReviewBanner = () => {
  const [pendingSeriesTitles, setPendingSeriesTitles] = useState<string[]>([]);

  const refresh = useCallback(() => {
    getPendingAnilistSyncs().then((pending) => {
      setPendingSeriesTitles(pending.map((entry) => entry.series_title));
    });
  }, []);

  useEffect(() => {
    refresh();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (SETTINGS.integrations.anilist.pendingSync.key in changes) {
        refresh();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  if (pendingSeriesTitles.length === 0) {
    return null;
  }

  const count = pendingSeriesTitles.length;

  return (
    <Alert status="warning" variant="kita" borderRadius="md" mb={2}>
      <Flex flex={1} alignItems="center" justifyContent="space-between" gap={2}>
        <Flex alignItems="center" gap={2}>
          <AlertIcon color="accent.primary" />
          <Text fontSize="sm">
            {count} AniList match{count === 1 ? "" : "es"} need{count === 1 ? "s" : ""} review —{" "}
            {formatPendingSeriesSummary(pendingSeriesTitles)}
          </Text>
        </Flex>
        <Button size="sm" variant="kita" onClick={() => chrome.runtime.sendMessage({ type: OPEN_ANILIST_PENDING_REVIEW })}>
          Review
        </Button>
      </Flex>
    </Alert>
  );
};

export default PendingAnilistReviewBanner;
