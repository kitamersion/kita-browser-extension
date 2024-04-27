import { useAnilistContext } from "@/context/anilistContext";
import { INTEGRATION_ANILIST_AUTH_POLL, INTEGRATION_ANILIST_AUTH_START } from "@/data/events";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";
import { Box, Button, Flex, FormControl, FormLabel, Input, Text } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import eventBus from "@/api/eventbus";
import LoadingState from "@/components/states/LoadingState";

const Anilist = () => {
  const { isInitialized, anilistConfig, anilistAuth, anilistAuthStatus } = useAnilistContext();
  const [anilistConfigState, setAnilistConfigState] = useState<AnilistConfig | null>(null);
  const [anilistAuthState, setAnilistAuthState] = useState<AnilistAuth | null>(null);

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isInitialized) {
      console.log("setting anilist config/auth state");
      setAnilistConfigState(anilistConfig);
      setAnilistAuthState(anilistAuth);
    }
  }, [anilistAuth, anilistAuthState, anilistConfig, anilistConfigState, isInitialized]);

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

  const handleFetchData = async () => {
    const apiUrl = "https://graphql.anilist.co";
    const query = `
query ($id: Int) { # Define which variables will be used in the query (id)
Media (id: $id, type: ANIME) { # Insert our variables into the query arguments (id) (type: ANIME is hard-coded in the query)
    id
    title {
    romaji
    english
    native
    }
}
}
`;
    const variables = {
      id: 15125,
    };
    const options = {
      method: "POST",
      headers: {
        Authorization: "Bearer " + anilistAuth.access_token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: query,
        variables: variables,
      }),
    };
    const response = await fetch(apiUrl, options);
    const data = await response.json();
    console.log(data);
    setData(data);
  };

  if (!isInitialized) return <LoadingState />;

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
          </Flex>
        </form>

        {anilistAuthStatus === "authorized" && (
          <Button colorScheme="blue" onClick={handleFetchData}>
            Manual Fetch
          </Button>
        )}

        <div>{JSON.stringify(data ?? "Nothing here")}</div>

        <div>{JSON.stringify(anilistConfig ?? "No Config here")}</div>

        <div>{JSON.stringify(!anilistAuth ? "No Auth here" : "has data")}</div>
      </Flex>
    </Box>
  );
};

export default Anilist;
