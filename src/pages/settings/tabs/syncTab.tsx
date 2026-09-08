import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Progress,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CheckCircleIcon, EmailIcon, LockIcon, RepeatClockIcon, TimeIcon } from "@chakra-ui/icons";
import { useSyncContext } from "@/context/syncContext";
import SummaryItem from "@/components/summaryItem";

const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

// Green mirrors the "success" color already used for synced states elsewhere; orange/red give an
// early warning before a write is rejected by the storage-quota-exceeded error.
const quotaColorScheme = (currentBytes: number, maxBytes: number) => {
  const percentUsed = (currentBytes / maxBytes) * 100;
  if (percentUsed >= 90) return "red";
  if (percentUsed >= 70) return "orange";
  return "green";
};

const SyncTab: React.FC = () => {
  const {
    isSignedIn,
    email,
    quota,
    lastSyncedAt,
    nextSyncAt,
    error,
    isSubmitting,
    isSyncing,
    pendingConfirmationEmail,
    signUp,
    signIn,
    signOut,
    syncNow,
  } = useSyncContext();
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");

  if (pendingConfirmationEmail) {
    return (
      <Box
        bg="bg.secondary"
        border="1px solid"
        borderColor="border.primary"
        rounded="xl"
        p={6}
        maxW="sm"
        data-testid="sync-pending-confirmation"
      >
        <VStack align="stretch" spacing={4}>
          <Heading size="md" color="accent.primary">
            Confirm your email
          </Heading>
          <Text fontSize="sm" color="text.secondary">
            We sent a confirmation link to {pendingConfirmationEmail}. Click it to finish signing up — this page will update automatically
            once you do.
          </Text>
          <Spinner size="sm" color="accent.primary" />
        </VStack>
      </Box>
    );
  }

  if (isSignedIn) {
    const quotaScheme = quota ? quotaColorScheme(quota.currentBytes, quota.maxBytes) : undefined;

    return (
      <Box data-testid="sync-signed-in">
        <VStack align="stretch" spacing={6}>
          <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" direction={{ base: "column", md: "row" }} gap={4}>
            <VStack align="flex-start" spacing={1}>
              <Heading size="lg" color="accent.primary">
                Sync
              </Heading>
              <HStack fontSize="sm" color="text.secondary">
                <CheckCircleIcon color="kita.success" />
                <Text>Signed in as {email}</Text>
              </HStack>
            </VStack>
            <HStack>
              <Button
                data-testid="sync-now-button"
                variant="kita"
                leftIcon={<RepeatClockIcon />}
                isLoading={isSyncing}
                onClick={() => syncNow()}
              >
                Sync now
              </Button>
              <Button
                data-testid="sync-sign-out-button"
                variant="kita-outline"
                onClick={() => {
                  signOut();
                  setFormEmail("");
                  setFormPassword("");
                }}
              >
                Sign out
              </Button>
            </HStack>
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            <SummaryItem icon={TimeIcon}>
              <SummaryItem.Value value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"} />
              <SummaryItem.Title>Last Synced</SummaryItem.Title>
            </SummaryItem>
            <Box data-testid="sync-next-sync-at">
              <SummaryItem icon={RepeatClockIcon}>
                <SummaryItem.Value value={nextSyncAt ? new Date(nextSyncAt).toLocaleString() : "Not scheduled"} />
                <SummaryItem.Title>Next Sync</SummaryItem.Title>
              </SummaryItem>
            </Box>
          </SimpleGrid>

          {quota && (
            <Box bg="bg.secondary" border="1px solid" borderColor="border.primary" rounded="2xl" p={6}>
              <Text mb={2} fontSize="xs" color="text.secondary" fontWeight="medium" textTransform="uppercase" letterSpacing="wider">
                Storage Used
              </Text>
              <Text mb={3} fontSize="sm" color="text.secondary" fontWeight={quotaScheme === "red" ? "bold" : "normal"}>
                {formatBytes(quota.currentBytes)} / {formatBytes(quota.maxBytes)} used
              </Text>
              <Progress value={(quota.currentBytes / quota.maxBytes) * 100} colorScheme={quotaScheme} bg="bg.tertiary" rounded="full" />
            </Box>
          )}
        </VStack>
      </Box>
    );
  }

  return (
    <Flex align="center" justify="center" minH="70vh">
      <Box
        bg="bg.secondary"
        border="1px solid"
        borderColor="border.primary"
        rounded="xl"
        p={6}
        maxW="sm"
        w="full"
        data-testid="sync-signed-out"
      >
        <VStack align="stretch" spacing={4}>
          <Heading size="md" color="accent.primary">
            Sync
          </Heading>
          <Text fontSize="sm" color="text.secondary">
            Sign in to sync your videos, tags, and auto-tag rules across devices and browsers.
          </Text>
          {error && (
            <Alert status="error" variant="kita" rounded="lg" fontSize="sm">
              <AlertIcon />
              {error}
            </Alert>
          )}
          <FormControl>
            <FormLabel>Email</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <EmailIcon color="text.tertiary" />
              </InputLeftElement>
              <Input data-testid="sync-email-input" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </InputGroup>
          </FormControl>
          <FormControl>
            <FormLabel>Password</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <LockIcon color="text.tertiary" />
              </InputLeftElement>
              <Input
                data-testid="sync-password-input"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
              />
            </InputGroup>
          </FormControl>
          <Button data-testid="sync-sign-in-button" variant="kita" isLoading={isSubmitting} onClick={() => signIn(formEmail, formPassword)}>
            Sign in
          </Button>
          <Button
            data-testid="sync-sign-up-button"
            variant="kita-outline"
            isLoading={isSubmitting}
            onClick={() => signUp(formEmail, formPassword)}
          >
            Create account
          </Button>
        </VStack>
      </Box>
    </Flex>
  );
};

export default SyncTab;
