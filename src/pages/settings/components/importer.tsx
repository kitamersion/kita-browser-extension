import { importFromJSON } from "@/api/importer";
import { Button } from "@chakra-ui/react";
import React, { useCallback, useRef } from "react";

const Importer = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportData = useCallback(async () => {
    if (fileInputRef.current?.files?.length) {
      const file = fileInputRef.current.files[0];
      await importFromJSON(file);
    }
  }, []);

  const handleFileInputChange = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <Button onClick={handleFileInputChange}>Import JSON</Button>
      <input type="file" accept=".json" style={{ display: "none" }} ref={fileInputRef} onChange={handleImportData} />
    </>
  );
};

export default Importer;
