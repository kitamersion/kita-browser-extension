import { useAnilistContext } from "@/context/anilistContext";
import { INTEGRATION_ANILIST_AUTH_DISCONNECT, INTEGRATION_ANILIST_AUTH_POLL, INTEGRATION_ANILIST_AUTH_START } from "@/data/events";
import { AnilistConfig } from "@/types/integrations/anilist";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  useClipboard,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import eventBus from "@/api/eventbus";
import LoadingState from "@/components/states/LoadingState";
import { useGetMeQuery } from "@/graphql";
import AnilistProfile from "../components/anilist/anilistProfile";
import AutoSyncMediaToggle from "../components/autoSyncMediaToggle";

const Anilist = () => {
  const { isInitialized, anilistConfig, anilistAuthStatus } = useAnilistContext();
  const [anilistConfigState, setAnilistConfigState] = useState<AnilistConfig>({
    anilistId: "",
    secret: "",
    redirectUrl: "",
  });

  const [showPasswordInput, setShowPasswordInput] = React.useState(false);
  const handleShowPasswordInput = () => setShowPasswordInput(!showPasswordInput);
  const { hasCopied, onCopy } = useClipboard(anilistConfigState.redirectUrl ?? "");

  const { data, loading } = useGetMeQuery({
    skip: anilistAuthStatus !== "authorized",
  });

  useEffect(() => {
    if (isInitialized) {
      setAnilistConfigState(anilistConfig);
    }
  }, [anilistConfig, isInitialized]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    const { name, value } = e.target;
    const updatedState = { ...(anilistConfigState as AnilistConfig), [name]: value ?? "" };
    setAnilistConfigState(updatedState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    eventBus.publish(INTEGRATION_ANILIST_AUTH_START, { message: "start anilist auth", value: anilistConfigState });
    eventBus.publish(INTEGRATION_ANILIST_AUTH_POLL, { message: "start polling anilist auth status", value: "" });
  };

  const handleDisconnect = () => {
    setAnilistConfigState({ ...anilistConfig, anilistId: "", secret: "" });
    eventBus.publish(INTEGRATION_ANILIST_AUTH_DISCONNECT, { message: "delete anilist auth", value: "" });
  };

  if (!isInitialized || loading) return <LoadingState />;

  return (
    <Box
      width={"full"}
      boxShadow={"dark-lg"}
      rounded={"2xl"}
      p={4}
      bg="bg.secondary"
      border="1px solid"
      borderColor="border.primary"
      _hover={{
        borderColor: "border.accent",
        boxShadow: "2xl",
      }}
      transition="all 0.2s"
    >
      <Flex flexDirection={"column"} gap={4}>
        <Flex justifyContent={"space-between"}>
          <Heading as="h2" fontWeight={"bold"} fontSize={"large"} color="text.primary">
            Anilist
          </Heading>
          {anilistAuthStatus === "initial" && <Text color="text.secondary">Not Connected</Text>}
          {anilistAuthStatus === "pending" && <Text color="orange.400">Connecting...</Text>}
          {anilistAuthStatus === "authorized" && <Text color="green.400">Authorized</Text>}
          {anilistAuthStatus === "unauthorized" && <Text color="red.400">Unauthorized</Text>}
          {anilistAuthStatus === "error" && <Text color="red.400">Error Connecting</Text>}
        </Flex>
        <form onSubmit={handleSubmit}>
          <Flex flexDirection={"column"} gap={4}>
            <FormControl id="anilistId">
              <FormLabel color="text.secondary">Anilist Id</FormLabel>
              <Input
                name="anilistId"
                value={anilistConfigState?.anilistId}
                onChange={handleChange}
                bg="bg.tertiary"
                borderColor="border.primary"
                color="text.primary"
                _hover={{ borderColor: "border.primary" }}
                _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
              />
            </FormControl>
            <FormControl id="secret">
              <FormLabel color="text.secondary">Secret</FormLabel>
              <InputGroup size="md">
                <Input
                  name="secret"
                  type={showPasswordInput ? "text" : "password"}
                  value={anilistConfigState?.secret}
                  onChange={handleChange}
                  bg="bg.tertiary"
                  borderColor="border.primary"
                  color="text.primary"
                  _hover={{ borderColor: "border.primary" }}
                  _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
                />
                <InputRightElement width="4.5rem">
                  <Button
                    h="1.75rem"
                    size="sm"
                    onClick={handleShowPasswordInput}
                    bg="bg.primary"
                    color="text.primary"
                    _hover={{ bg: "bg.primary", opacity: 0.9 }}
                  >
                    {showPasswordInput ? "Hide" : "Show"}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <FormControl id="anilistRedirectUrl" mt={10}>
              <FormLabel>
                <Text color="text.secondary">Redirect URL (readonly)</Text>
                <Text fontSize={"small"} color="text.tertiary">
                  Configure redirect to the URL below (This is your extension URL)
                </Text>
              </FormLabel>
              <InputGroup size="md">
                <Input
                  readOnly
                  name="anilistRedirectUrl"
                  type={"text"}
                  value={anilistConfigState?.redirectUrl}
                  onChange={handleChange}
                  bg="bg.tertiary"
                  borderColor="border.primary"
                  color="text.primary"
                  _hover={{ borderColor: "border.primary" }}
                  _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
                />
                <InputRightElement width="4.5rem">
                  <Button
                    h="1.75rem"
                    size="sm"
                    onClick={onCopy}
                    bg="bg.primary"
                    color="text.primary"
                    _hover={{ bg: "bg.primary", opacity: 0.9 }}
                  >
                    {hasCopied ? "Copied" : "Copy"}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {anilistAuthStatus !== "authorized" && (
              <Button
                colorScheme="green"
                type="submit"
                bg="green.500"
                color="white"
                _hover={{ bg: "green.600" }}
                _active={{ bg: "green.700" }}
              >
                Connect
              </Button>
            )}
            {anilistAuthStatus === "authorized" && (
              <Button
                colorScheme="red"
                onClick={handleDisconnect}
                bg="red.500"
                color="white"
                _hover={{ bg: "red.600" }}
                _active={{ bg: "red.700" }}
              >
                Disconnect
              </Button>
            )}
          </Flex>
        </form>

        {anilistAuthStatus === "authorized" && <AnilistProfile Viewer={data?.Viewer} />}
        <AutoSyncMediaToggle />
      </Flex>
    </Box>
  );
};

export default Anilist;
