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
        <Text color="text.primary">
          You can manually copy and save your settings and data. Make sure to <b>save as a json file.</b>
        </Text>
        <Text color="text.secondary">
          Example:{" "}
          <Code bg="bg.secondary" color="accent.primary" px={2} py={1}>
            kitamersion-data.json
          </Code>
        </Text>
      </Flex>
      {settingsAndData && (
        <Box width={"full"}>
          <Textarea
            value={settingsAndData}
            readOnly
            mb="4"
            minHeight={"400px"}
            bg="bg.secondary"
            borderColor="border.primary"
            color="text.primary"
            fontSize="sm"
            fontFamily="mono"
            _hover={{ borderColor: "border.primary" }}
            _focus={{ borderColor: "accent.primary", boxShadow: `0 0 0 1px var(--chakra-colors-accent-primary)` }}
          />
          <Button
            onClick={onCopy}
            mr="2"
            bg="accent.primary"
            color="white"
            _hover={{ bg: "accent.primary", opacity: 0.9 }}
            _active={{ bg: "accent.primary", opacity: 0.8 }}
          >
            {hasCopied ? "Copied!" : "Copy"}
          </Button>
        </Box>
      )}
    </>
  );
};

export default ManuallyCopySettingsAndData;
