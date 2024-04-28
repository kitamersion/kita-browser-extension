import { useAnilistContext } from "@/context/anilistContext";
import { INTEGRATION_ANILIST_AUTH_DISCONNECT, INTEGRATION_ANILIST_AUTH_POLL, INTEGRATION_ANILIST_AUTH_START } from "@/data/events";
import { AnilistConfig } from "@/types/integrations/anilist";
import { Box, Button, Flex, FormControl, FormLabel, Input, Text } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import eventBus from "@/api/eventbus";
import LoadingState from "@/components/states/LoadingState";
import { useGetMeQuery } from "@/graphql";

const Anilist = () => {
  const { isInitialized, anilistConfig, anilistAuth, anilistAuthStatus } = useAnilistContext();
  const [anilistConfigState, setAnilistConfigState] = useState<AnilistConfig | null>(null);

  const { data, loading, error } = useGetMeQuery({
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
    eventBus.publish(INTEGRATION_ANILIST_AUTH_DISCONNECT, { message: "delete anilist auth", value: "" });
  };

  if (!isInitialized || loading) return <LoadingState />;

  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <Flex flexDirection={"column"} gap={4}>
        <Flex justifyContent={"space-between"}>
          <Text as="h2" fontWeight={"bold"} fontSize={"large"}>
            Anilist
          </Text>
          {anilistAuthStatus === "initial" && <Text>Not Connected</Text>}
          {anilistAuthStatus === "pending" && <Text>Connecting...</Text>}
          {anilistAuthStatus === "authorized" && <Text>Authorized</Text>}
          {anilistAuthStatus === "unauthorized" && <Text>Unauthorized</Text>}
          {anilistAuthStatus === "error" && <Text>Error Connecting</Text>}
        </Flex>
        <form onSubmit={handleSubmit}>
          <Flex flexDirection={"column"} gap={4}>
            <FormControl id="anilistId">
              <FormLabel>Anilist Id</FormLabel>
              <Input name="anilistId" value={anilistConfigState?.anilistId} onChange={handleChange} />
            </FormControl>
            <FormControl id="secret">
              <FormLabel>Secret</FormLabel>
              <Input name="secret" value={anilistConfigState?.secret} onChange={handleChange} />
            </FormControl>
            <FormControl id="redirectUrl" mt={10}>
              <FormLabel>
                <Text>Redirect URL (readonly)</Text>
                <Text fontSize={"small"}>In anilist, configure your redirect url to the text below</Text>
              </FormLabel>
              <Input readOnly name="redirectUrl" value={anilistConfigState?.redirectUrl} onChange={handleChange} />
            </FormControl>

            {anilistAuthStatus !== "authorized" && (
              <Button colorScheme="green" type="submit">
                Connect
              </Button>
            )}
            {anilistAuthStatus === "authorized" && (
              <Button colorScheme="red" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </Flex>
        </form>

        <div>
          <p>{data?.Viewer?.id}</p>
          <p>{data?.Viewer?.name}</p>
        </div>

        <div>{JSON.stringify(error ?? "")}</div>

        <div>{JSON.stringify(anilistConfig ?? "No Config here")}</div>

        <div>{JSON.stringify(!anilistAuth ? "No Auth here" : "has data")}</div>
      </Flex>
    </Box>
  );
};

export default Anilist;
