import { importFromJSON } from "@/api/importer";
import { useToastContext } from "@/context/toastNotificationContext";
import { Button } from "@chakra-ui/react";
import React, { useCallback, useRef } from "react";

const Importer = () => {
  const { showToastPromise } = useToastContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportData = useCallback(async () => {
    if (fileInputRef.current?.files?.length) {
      const file = fileInputRef.current.files[0];
      showToastPromise(importFromJSON(file), {
        loading: { title: "Importing data", status: "loading", description: "Please do not leave or refresh page while importing" },
        success: { title: "Data imported", status: "success", description: "You can refresh the page to see your changes" },
        error: { title: "Failed to import data", status: "error" },
      });
    }
  }, [showToastPromise]);

  const handleFileInputChange = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <Button onClick={handleFileInputChange}>Import settings and data</Button>
      <input type="file" accept=".json" style={{ display: "none" }} ref={fileInputRef} onChange={handleImportData} />
    </>
  );
};

export default Importer;
