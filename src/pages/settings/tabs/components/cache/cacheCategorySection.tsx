import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  HStack,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { MdCategory, MdHelpOutline, MdList, MdPerson } from "react-icons/md";
import { AniListCacheCategory, AniListCacheCategorySummary } from "@/api/anilistCache";
import CacheEntryRow from "./cacheEntryRow";
import { formatBytes } from "./cacheFormatting";

const CATEGORY_ICON: Record<AniListCacheCategory, React.ElementType> = {
  profile: MdPerson,
  lists: MdList,
  collections: MdCategory,
  search: SearchIcon,
  other: MdHelpOutline,
};

interface CacheCategorySectionProps {
  summary: AniListCacheCategorySummary;
  isLoading: boolean;
  onDelete: (key: string) => Promise<void>;
  onClearCategory: (category: AniListCacheCategory) => Promise<void>;
  onRefresh?: (key: string) => Promise<void>;
}

const CacheCategorySection: React.FC<CacheCategorySectionProps> = ({ summary, isLoading, onDelete, onClearCategory, onRefresh }) => {
  const { isOpen: isConfirmOpen, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const [isClearing, setIsClearing] = useState(false);
  const Icon = CATEGORY_ICON[summary.category];

  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await onClearCategory(summary.category);
      closeConfirm();
    } catch {
      // Surfacing/toasting the failure is the caller's responsibility (the
      // CacheTab-level onClearCategory handler). This component only
      // guarantees the button never gets stuck in a loading state.
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Box
      as="section"
      bg="bg.secondary"
      border="1px solid"
      borderColor="border.primary"
      rounded="lg"
      p={4}
      data-testid={`cache-category-${summary.category}`}
    >
      <Modal isOpen={isConfirmOpen} onClose={closeConfirm}>
        <ModalOverlay />
        <ModalContent bg="bg.primary" color="text.primary">
          <ModalHeader color="accent.primary">Clear {summary.label}?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              This deletes all {summary.entries.length} cached {summary.label.toLowerCase()} entries.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleConfirmClear}
              isLoading={isClearing}
              data-testid={`confirm-clear-category-${summary.category}`}
            >
              Clear category
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <HStack justify="space-between">
        <HStack>
          <Icon />
          <Heading size="sm" color="text.primary">
            {summary.label}
          </Heading>
          <Badge>{summary.entries.length}</Badge>
          <Text color="text.tertiary" fontSize="xs">
            {formatBytes(summary.totalSizeBytes)}
          </Text>
        </HStack>
        <Button
          size="xs"
          colorScheme="red"
          variant="outline"
          onClick={openConfirm}
          isDisabled={summary.entries.length === 0}
          data-testid={`clear-category-${summary.category}`}
        >
          Clear category
        </Button>
      </HStack>

      <VStack align="stretch" spacing={0} mt={2}>
        {isLoading && <Text color="text.secondary">Loading…</Text>}
        {!isLoading && summary.entries.length === 0 && (
          <Text color="text.secondary" fontSize="sm" data-testid={`cache-category-empty-${summary.category}`}>
            Nothing cached yet.
          </Text>
        )}
        {!isLoading &&
          summary.entries.map((entry) => (
            <CacheEntryRow key={entry.key} category={summary.category} entry={entry} onDelete={onDelete} onRefresh={onRefresh} />
          ))}
      </VStack>
    </Box>
  );
};

export default CacheCategorySection;
