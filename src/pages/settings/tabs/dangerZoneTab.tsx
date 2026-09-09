import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Input,
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
import { useSyncContext } from "@/context/syncContext";
import KitaSyncPausedAlert from "@/components/kitaSyncPausedAlert";

const DangerZoneTab: React.FC = () => {
  const { isSignedIn, isKitaSyncPaused, resumeKitaSync, deleteAllData, deleteAccount, purgeExpiredTombstones } = useSyncContext();
  const { isOpen: isDeleteDataOpen, onOpen: openDeleteDataModal, onClose: closeDeleteDataModal } = useDisclosure();
  const { isOpen: isDeleteAccountOpen, onOpen: openDeleteAccountModal, onClose: closeDeleteAccountModalBase } = useDisclosure();
  const { isOpen: isPurgeOpen, onOpen: openPurgeModal, onClose: closePurgeModal } = useDisclosure();
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const closeDeleteAccountModal = () => {
    setConfirmText("");
    closeDeleteAccountModalBase();
  };

  const handleConfirmDeleteData = async () => {
    setIsDeletingData(true);
    const { error } = await deleteAllData();
    setIsDeletingData(false);
    if (!error) closeDeleteDataModal();
  };

  const handleConfirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    const { error } = await deleteAccount();
    setIsDeletingAccount(false);
    if (!error) closeDeleteAccountModal();
  };

  const handleConfirmPurge = async () => {
    setIsPurging(true);
    const { error } = await purgeExpiredTombstones();
    setIsPurging(false);
    if (!error) closePurgeModal();
  };

  if (!isSignedIn) {
    return (
      <Box
        bg="bg.secondary"
        border="1px solid"
        borderColor="border.primary"
        rounded="xl"
        p={6}
        maxW="sm"
        data-testid="danger-zone-signed-out"
      >
        <Heading size="md" color="accent.primary" mb={2}>
          Danger Zone
        </Heading>
        <Text fontSize="sm" color="text.secondary">
          Sign in on the Sync tab to manage or delete your account data.
        </Text>
      </Box>
    );
  }

  return (
    <Box data-testid="danger-zone">
      <VStack align="stretch" spacing={6}>
        <Heading size="lg" color="accent.primary">
          Danger Zone
        </Heading>

        {isKitaSyncPaused && <KitaSyncPausedAlert onResume={() => resumeKitaSync()} />}

        <Box bg="bg.secondary" border="1px solid" borderColor="red.500" rounded="2xl" p={6}>
          <VStack align="stretch" spacing={4} divider={<Divider borderColor="border.primary" />}>
            <HStack justify="space-between" align="center" wrap="wrap" gap={4}>
              <Box>
                <Text fontWeight="bold" color="text.primary">
                  Delete all data
                </Text>
                <Text fontSize="sm" color="text.secondary">
                  Permanently deletes your synced videos, tags, and auto-tag rules. Your account stays active.
                </Text>
              </Box>
              <Button data-testid="open-delete-data-button" colorScheme="red" variant="outline" onClick={openDeleteDataModal}>
                Delete all data
              </Button>
            </HStack>

            <HStack justify="space-between" align="center" wrap="wrap" gap={4}>
              <Box>
                <Text fontWeight="bold" color="text.primary">
                  Delete account
                </Text>
                <Text fontSize="sm" color="text.secondary">
                  Permanently deletes your account and all synced data. This cannot be undone.
                </Text>
              </Box>
              <Button data-testid="open-delete-account-button" colorScheme="red" onClick={openDeleteAccountModal}>
                Delete account
              </Button>
            </HStack>

            <HStack justify="space-between" align="center" wrap="wrap" gap={4}>
              <Box>
                <Text fontWeight="bold" color="text.primary">
                  Clear expired tombstones
                </Text>
                <Text fontSize="sm" color="text.secondary">
                  Permanently removes videos, tags, and auto-tag rules that were deleted more than 30 days ago and have already synced.
                  Doesn&apos;t touch anything currently in your library.
                </Text>
              </Box>
              <Button data-testid="open-purge-tombstones-button" colorScheme="red" variant="outline" onClick={openPurgeModal}>
                Clear expired tombstones
              </Button>
            </HStack>
          </VStack>
        </Box>
      </VStack>

      <Modal isOpen={isDeleteDataOpen} onClose={closeDeleteDataModal} size="md">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="bg.primary" border="1px solid" borderColor="border.primary" boxShadow="2xl">
          <ModalHeader color="text.primary">Delete all data?</ModalHeader>
          <ModalCloseButton color="text.secondary" />
          <ModalBody>
            <Alert status="error" variant="kita" rounded="lg" fontSize="sm">
              <AlertIcon />
              This permanently deletes all your synced videos, tags, and auto-tag rules from the server, and pauses Kita Sync so this device
              doesn&apos;t immediately re-upload your local data. This cannot be undone. Other devices signed in to this account will keep
              syncing and may re-upload their own local copies.
            </Alert>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" color="text.secondary" onClick={closeDeleteDataModal}>
              Cancel
            </Button>
            <Button data-testid="confirm-delete-data-button" colorScheme="red" isLoading={isDeletingData} onClick={handleConfirmDeleteData}>
              Okay, delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteAccountOpen} onClose={closeDeleteAccountModal} size="md">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="bg.primary" border="1px solid" borderColor="border.primary" boxShadow="2xl">
          <ModalHeader color="text.primary">Delete your account?</ModalHeader>
          <ModalCloseButton color="text.secondary" />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Alert status="error" variant="kita" rounded="lg" fontSize="sm">
                <AlertIcon />
                This permanently deletes your account and all synced data. This cannot be undone.
              </Alert>
              <FormControl>
                <FormLabel>
                  Type <b>delete</b> to confirm
                </FormLabel>
                <Input data-testid="delete-account-confirm-input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" color="text.secondary" onClick={closeDeleteAccountModal}>
              Cancel
            </Button>
            <Button
              data-testid="confirm-delete-account-button"
              colorScheme="red"
              isDisabled={confirmText.trim().toLowerCase() !== "delete"}
              isLoading={isDeletingAccount}
              onClick={handleConfirmDeleteAccount}
            >
              Delete account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isPurgeOpen} onClose={closePurgeModal} size="md">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="bg.primary" border="1px solid" borderColor="border.primary" boxShadow="2xl">
          <ModalHeader color="text.primary">Clear expired tombstones?</ModalHeader>
          <ModalCloseButton color="text.secondary" />
          <ModalBody>
            <Alert status="warning" variant="kita" rounded="lg" fontSize="sm">
              <AlertIcon />
              This permanently removes already-deleted records older than 30 days from the server to free up storage. This cannot be undone.
            </Alert>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" color="text.secondary" onClick={closePurgeModal}>
              Cancel
            </Button>
            <Button data-testid="confirm-purge-tombstones-button" colorScheme="red" isLoading={isPurging} onClick={handleConfirmPurge}>
              Okay, clear
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DangerZoneTab;
