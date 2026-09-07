import React, { useState } from "react";
import { Box, Button, FormControl, FormLabel, Heading, Input, Progress, Text, VStack } from "@chakra-ui/react";
import { useSyncContext } from "@/context/syncContext";

const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const SyncTab: React.FC = () => {
  const { isSignedIn, email, quota, lastSyncedAt, error, signUp, signIn, signOut } = useSyncContext();
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");

  if (isSignedIn) {
    return (
      <VStack align="stretch" spacing={4} data-testid="sync-signed-in">
        <Heading size="md">Sync</Heading>
        <Text>Signed in as {email}</Text>
        <Text>Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "never"}</Text>
        {quota && (
          <Box>
            <Text mb={1}>
              {formatBytes(quota.currentBytes)} / {formatBytes(quota.maxBytes)} used
            </Text>
            <Progress value={(quota.currentBytes / quota.maxBytes) * 100} />
          </Box>
        )}
        <Button data-testid="sync-sign-out-button" onClick={() => signOut()}>
          Sign out
        </Button>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={4} maxW="sm" data-testid="sync-signed-out">
      <Heading size="md">Sync</Heading>
      <Text fontSize="sm" color="text.secondary">
        Sign in to sync your videos, tags, and auto-tag rules across devices and browsers.
      </Text>
      {error && <Text color="red.400">{error}</Text>}
      <FormControl>
        <FormLabel>Email</FormLabel>
        <Input data-testid="sync-email-input" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
      </FormControl>
      <FormControl>
        <FormLabel>Password</FormLabel>
        <Input
          data-testid="sync-password-input"
          type="password"
          value={formPassword}
          onChange={(e) => setFormPassword(e.target.value)}
        />
      </FormControl>
      <Button data-testid="sync-sign-in-button" onClick={() => signIn(formEmail, formPassword)}>
        Sign in
      </Button>
      <Button data-testid="sync-sign-up-button" variant="outline" onClick={() => signUp(formEmail, formPassword)}>
        Create account
      </Button>
    </VStack>
  );
};

export default SyncTab;
