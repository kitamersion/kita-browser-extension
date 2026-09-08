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

const DangerZoneTab: React.FC = () => {
  const { isSignedIn, isKitaSyncPaused, resumeKitaSync, deleteAllData, deleteAccount } = useSyncContext();
  const { isOpen: isDeleteDataOpen, onOpen: openDeleteDataModal, onClose: closeDeleteDataModal } = useDisclosure();
  const { isOpen: isDeleteAccountOpen, onOpen: openDeleteAccountModal, onClose: closeDeleteAccountModalBase } = useDisclosure();
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
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

        {isKitaSyncPaused && (
          <Alert status="warning" variant="kita" rounded="lg" fontSize="sm">
            <AlertIcon />
            <Text flex="1">Kita Sync is paused.</Text>
            <Button size="sm" variant="kita-outline" onClick={() => resumeKitaSync()}>
              Resume Kita Sync
            </Button>
          </Alert>
        )}

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
              doesn&apos;t immediately re-upload your local data. This cannot be undone.
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
    </Box>
  );
};

export default DangerZoneTab;
