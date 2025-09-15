import { useMyAnimeListContext } from "@/context/myanimelistContext";
import {
  INTEGRATION_MYANIMELIST_AUTH_DISCONNECT,
  INTEGRATION_MYANIMELIST_AUTH_POLL,
  INTEGRATION_MYANIMELIST_AUTH_START,
} from "@/data/events";
import { MyAnimeListConfig } from "@/types/integrations/myanimelist";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
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
import AutoSyncMediaToggle from "../components/autoSyncMediaToggle";
import MyAnimeListProfile from "../components/myanimelist/myanimelistProfile";

/**
 * @deprecated MyAnimeList integration is deprecated due to no time
 * This component will be kept for now if descision changes
 * Project will continue with Anilist
 *
 */
const MyAnimeList = () => {
  const { isInitialized, MyAnimeListConfig, MyAnimeListAuthStatus } = useMyAnimeListContext();
  const [MyAnimeListConfigState, setMyAnimeListConfigState] = useState<MyAnimeListConfig>({
    myAnimeListId: "",
    secret: "",
    redirectUrl: "",
  });

  const [showPasswordInput, setShowPasswordInput] = React.useState(false);
  const handleShowPasswordInput = () => setShowPasswordInput(!showPasswordInput);
  const { hasCopied, onCopy } = useClipboard(MyAnimeListConfigState.redirectUrl ?? "");

  useEffect(() => {
    if (isInitialized) {
      setMyAnimeListConfigState(MyAnimeListConfig);
    }
  }, [MyAnimeListConfig, isInitialized]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    const { name, value } = e.target;
    const updatedState = { ...(MyAnimeListConfigState as MyAnimeListConfig), [name]: value ?? "" };
    setMyAnimeListConfigState(updatedState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    eventBus.publish(INTEGRATION_MYANIMELIST_AUTH_START, { message: "start MyAnimeList auth", value: MyAnimeListConfigState });
    eventBus.publish(INTEGRATION_MYANIMELIST_AUTH_POLL, { message: "start polling MyAnimeList auth status", value: "" });
  };

  const handleDisconnect = () => {
    setMyAnimeListConfigState({ myAnimeListId: "", secret: "", redirectUrl: MyAnimeListConfig.redirectUrl });
    eventBus.publish(INTEGRATION_MYANIMELIST_AUTH_DISCONNECT, { message: "delete MyAnimeList auth", value: "" });
  };

  if (!isInitialized) return <LoadingState />;

  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <Flex flexDirection={"column"} gap={4}>
        <Flex justifyContent={"space-between"}>
          <Heading as="h2" fontWeight={"bold"} fontSize={"large"}>
            MyAnimeList
          </Heading>
          {MyAnimeListAuthStatus === "initial" && <Text>Not Connected</Text>}
          {MyAnimeListAuthStatus === "pending" && <Text>Connecting...</Text>}
          {MyAnimeListAuthStatus === "authorized" && <Text>Authorized</Text>}
          {MyAnimeListAuthStatus === "unauthorized" && <Text>Unauthorized</Text>}
          {MyAnimeListAuthStatus === "error" && <Text>Error Connecting</Text>}
        </Flex>
        <Alert status="error" rounded={"xl"}>
          <Flex flexDirection={"row"} alignItems={"center"}>
            <AlertIcon />
            <Flex flexDirection={"column"}>
              <AlertTitle>Authentication may take a while</AlertTitle>
              <AlertDescription>
                To save costs, we use a free service that scales down on inactivity. It may take a minute to start...
              </AlertDescription>
            </Flex>
          </Flex>
        </Alert>
        <form onSubmit={handleSubmit}>
          <Flex flexDirection={"column"} gap={4}>
            <FormControl id="myAnimeListId">
              <FormLabel>Client Id</FormLabel>
              <Input name="myAnimeListId" value={MyAnimeListConfigState?.myAnimeListId} onChange={handleChange} />
            </FormControl>
            <FormControl id="secret">
              <FormLabel>Secret</FormLabel>
              <InputGroup size="md">
                <Input
                  name="secret"
                  type={showPasswordInput ? "text" : "password"}
                  value={MyAnimeListConfigState?.secret}
                  onChange={handleChange}
                />
                <InputRightElement width="4.5rem">
                  <Button h="1.75rem" size="sm" onClick={handleShowPasswordInput}>
                    {showPasswordInput ? "Hide" : "Show"}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <FormControl id="malRedirectUrl" mt={10}>
              <FormLabel>
                <Text>Redirect URL (readonly)</Text>
                <Text fontSize={"small"}>Configure redirect to the URL below (This is your extension URL)</Text>
              </FormLabel>

              <InputGroup size="md">
                <Input readOnly name="malRedirectUrl" type={"text"} value={MyAnimeListConfigState?.redirectUrl} onChange={handleChange} />
                <InputRightElement width="4.5rem">
                  <Button h="1.75rem" size="sm" onClick={onCopy}>
                    {hasCopied ? "Copied" : "Copy"}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {MyAnimeListAuthStatus !== "authorized" && (
              <Button colorScheme="green" type="submit">
                Connect
              </Button>
            )}
            {MyAnimeListAuthStatus === "authorized" && (
              <Button colorScheme="red" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </Flex>
        </form>

        {MyAnimeListAuthStatus === "authorized" && <MyAnimeListProfile authorized={MyAnimeListAuthStatus === "authorized"} />}
        <AutoSyncMediaToggle />
      </Flex>
    </Box>
  );
};

export default MyAnimeList;
