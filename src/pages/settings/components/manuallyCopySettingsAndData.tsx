import { getKitaSchema } from "@/api/schemaGenerator";
import { Box, Button, Code, Flex, Text, Textarea, useClipboard } from "@chakra-ui/react";
import React, { useCallback, useEffect, useState } from "react";

const ManuallyCopySettingsAndData = () => {
  const [settingsAndData, setSettingsAndData] = useState<string>("");
  const { hasCopied, onCopy } = useClipboard(settingsAndData);

  const fetchSchema = useCallback(async () => {
    const kitaSchema = await getKitaSchema();
    const jsonString = JSON.stringify(kitaSchema, null, 2);
    setSettingsAndData(jsonString);
  }, []);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  return (
    <>
      <Flex flexDirection={"column"}>
        <Text>
          You can manually copy and save your settings and data. Make sure to <b>save as a json file.</b>
        </Text>
        <Text>
          Example: <Code>kitamersion-data.json</Code>
        </Text>
      </Flex>
      {settingsAndData && (
        <Box width={"full"}>
          <Textarea value={settingsAndData} readOnly mb="4" minHeight={"400px"} />
          <Button onClick={onCopy} mr="2">
            {hasCopied ? "Copied!" : "Copy"}
          </Button>
        </Box>
      )}
    </>
  );
};

export default ManuallyCopySettingsAndData;
