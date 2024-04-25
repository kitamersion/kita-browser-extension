import { getAnilistAuth, getAnilistConfig } from "@/api/integration/anilist";
import { useAnilistContext } from "@/context/anilistContext";
import { INTEGRATION_ANILIST_AUTH } from "@/data/events";
import { RuntimeResponse } from "@/pages/background";
import { AnilistAuth, AnilistConfig } from "@/types/integrations/anilist";
import { Box, Button, Flex, FormControl, FormLabel, Input, Text } from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";

const Anilist = () => {
  const { anilistConfig: aniConfig, anilistAuth: aniAuth } = useAnilistContext();
  const [anilistConfig, setAnilistConfig] = useState<AnilistConfig>(aniConfig);
  const [anilistAuth, setAnilistAuth] = useState<AnilistAuth>(aniAuth);

  // calculate if expired or not
  const hasExpired = useMemo(() => {
    return anilistAuth.expires_in > Date.now();
  }, [anilistAuth.expires_in]);

  const [data, setData] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.preventDefault();
    const { name, value } = e.target;
    setAnilistConfig({ ...anilistConfig, [name]: value });
  };

  useEffect(() => {
    getAnilistConfig((data) => {
      if (data) {
        setAnilistConfig(data);
      }
    });

    getAnilistAuth((data) => {
      if (data) {
        setAnilistAuth(data);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = JSON.stringify(anilistConfig);
    chrome.runtime.sendMessage({ type: INTEGRATION_ANILIST_AUTH, payload: payload }, (response: RuntimeResponse) => {
      console.log(response.message);
      getAnilistAuth((data) => {
        console.log("Anilist auth", data);
        if (!data) return;
        setAnilistAuth(data);
      });
      if (response.status === "success") {
        handleFetchData();
      }
    });
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

  return (
    <Box width={"full"} boxShadow={"dark-lg"} rounded={"2xl"} p={4}>
      <Flex flexDirection={"column"} gap={4}>
        <Flex justifyContent={"space-between"}>
          <Text as="h2" fontWeight={"bold"} fontSize={"large"}>
            Anilist
          </Text>

          <p>{hasExpired ? "Not Connected" : "Connected"}</p>
        </Flex>
        <form onSubmit={handleSubmit}>
          <Flex flexDirection={"column"} gap={4}>
            <FormControl id="anilistId">
              <FormLabel>Anilist Id</FormLabel>
              <Input name="anilistId" value={anilistConfig.anilistId} onChange={handleChange} />
            </FormControl>
            <FormControl id="secret">
              <FormLabel>Secret</FormLabel>
              <Input name="secret" value={anilistConfig.secret} onChange={handleChange} />
            </FormControl>
            <FormControl id="redirectUrl" mt={10}>
              <FormLabel>
                <Text>Redirect URL (readonly)</Text>
                <Text fontSize={"small"}>In anilist, configure your redirect url to the text below</Text>
              </FormLabel>
              <Input readOnly name="redirectUrl" value={anilistConfig.redirectUrl} onChange={handleChange} />
            </FormControl>

            <Button colorScheme="green" type="submit">
              Connect
            </Button>
          </Flex>
        </form>

        <Button colorScheme="blue" onClick={handleFetchData}>
          Manual Fetch
        </Button>

        <div>{JSON.stringify(data ?? "Nothing here")}</div>
      </Flex>
    </Box>
  );
};

export default Anilist;
