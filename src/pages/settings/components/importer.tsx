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
        loading: { title: "Importing data", status: "loading" },
        success: { title: "Data imported", status: "success", description: "Please refresh the page to see the changes." },
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
