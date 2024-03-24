import { exportToJSON } from "@/api/exporter";
import { getKitaSchema } from "@/api/schemaGenerator";
import { Button, Flex, Heading } from "@chakra-ui/react";
import React from "react";

const Exporter = () => {
  const handleExportData = async () => {
    console.log("Exporting data...");
    const kitaSchema = await getKitaSchema();
    exportToJSON(kitaSchema, "kita-data.json");
  };

  return (
    <Flex flexDirection={"column"} gap={2}>
      <Heading as="h2" fontSize={"medium"}>
        Export data
      </Heading>
      <Button onClick={handleExportData}>Export</Button>
    </Flex>
  );
};

export default Exporter;
