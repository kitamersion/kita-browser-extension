import { exportToJSON } from "@/api/exporter";
import { getKitaSchema } from "@/api/schemaGenerator";
import { useToastContext } from "@/context/toastNotificationContext";
import { Button } from "@chakra-ui/react";
import React from "react";

const Exporter = () => {
  const { showToastPromise } = useToastContext();
  const handleExportData = async () => {
    const kitaSchema = await getKitaSchema();
    await showToastPromise(exportToJSON(kitaSchema, "kitamersion-data.json"), {
      loading: { title: "Exporting data", status: "loading" },
      success: { title: "Data exported", status: "success" },
      error: { title: "Failed to export data", status: "error" },
    });
  };

  return <Button onClick={handleExportData}>Export settings and data</Button>;
};

export default Exporter;
