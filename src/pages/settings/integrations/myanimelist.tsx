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

const MyAnimeList = () => {
  const { isInitialized, myAnimeListConfig, myAnimeListAuthStatus } = useMyAnimeListContext();
  const [myAnimeListConfigState, setMyAnimeListConfigState] = useState<MyAnimeListConfig>({
    myAnimeListId: "",
    secret: "",
    redirectUrl: "",
  });

  const [showPasswordInput, setShowPasswordInput] = React.useState(false);
  const handleShowPasswordInput = () => setShowPasswordInput(!showPasswordInput);
  const { hasCopied, onCopy } = useClipboard(myAnimeListConfigState.redirectUrl ?? "");

  useEffect(() => {
    if (isInitialized) {
      setMyAnimeListConfigState(myAnimeListConfig);
    }
  }, [myAnimeListConfig, isInitialized]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    const { name, value } = e.target;
    const updatedState = { ...(myAnimeListConfigState as MyAnimeListConfig), [name]: value ?? "" };
    setMyAnimeListConfigState(updatedState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    eventBus.publish(INTEGRATION_MYANIMELIST_AUTH_START, { message: "start MyAnimeList auth", value: myAnimeListConfigState });
    eventBus.publish(INTEGRATION_MYANIMELIST_AUTH_POLL, { message: "start polling MyAnimeList auth status", value: "" });
  };

  const handleDisconnect = () => {
    setMyAnimeListConfigState({ myAnimeListId: "", secret: "", redirectUrl: myAnimeListConfig.redirectUrl });
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
          {myAnimeListAuthStatus === "initial" && <Text>Not Connected</Text>}
          {myAnimeListAuthStatus === "pending" && <Text>Connecting...</Text>}
          {myAnimeListAuthStatus === "authorized" && <Text>Authorized</Text>}
          {myAnimeListAuthStatus === "unauthorized" && <Text>Unauthorized</Text>}
          {myAnimeListAuthStatus === "error" && <Text>Error Connecting</Text>}
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
              <Input name="myAnimeListId" value={myAnimeListConfigState?.myAnimeListId} onChange={handleChange} />
            </FormControl>
            <FormControl id="secret">
              <FormLabel>Secret</FormLabel>
              <InputGroup size="md">
                <Input
                  name="secret"
                  type={showPasswordInput ? "text" : "password"}
                  value={myAnimeListConfigState?.secret}
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
                <Input readOnly name="malRedirectUrl" type={"text"} value={myAnimeListConfigState?.redirectUrl} onChange={handleChange} />
                <InputRightElement width="4.5rem">
                  <Button h="1.75rem" size="sm" onClick={onCopy}>
                    {hasCopied ? "Copied" : "Copy"}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {myAnimeListAuthStatus !== "authorized" && (
              <Button colorScheme="green" type="submit">
                Connect
              </Button>
            )}
            {myAnimeListAuthStatus === "authorized" && (
              <Button colorScheme="red" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </Flex>
        </form>

        {myAnimeListAuthStatus === "authorized" && <MyAnimeListProfile authorized={myAnimeListAuthStatus === "authorized"} />}
        <AutoSyncMediaToggle />
      </Flex>
    </Box>
  );
};

export default MyAnimeList;
