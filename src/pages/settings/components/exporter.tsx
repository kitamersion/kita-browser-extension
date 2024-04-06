import { exportToJSON } from "@/api/exporter";
import { getKitaSchema } from "@/api/schemaGenerator";
import { Button } from "@chakra-ui/react";
import React from "react";

const Exporter = () => {
  const handleExportData = async () => {
    const kitaSchema = await getKitaSchema();
    exportToJSON(kitaSchema, "kita-data.json");
  };

  return <Button onClick={handleExportData}>Export JSON</Button>;
};

export default Exporter;
