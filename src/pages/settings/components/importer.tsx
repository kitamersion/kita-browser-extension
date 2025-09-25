import { importFromJSON, ImportProgress } from "@/api/importer";
import { Button, Progress, Text, VStack, useToast } from "@chakra-ui/react";
import React, { useCallback, useRef, useState } from "react";

const Importer = () => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const handleImportData = useCallback(async () => {
    if (fileInputRef.current?.files?.length) {
      const file = fileInputRef.current.files[0];
      setIsImporting(true);
      setProgress(null);

      // Show a custom toast with progress
      const progressToastId = toast({
        title: "Importing data",
        description: "Starting import...",
        status: "loading",
        duration: null,
        isClosable: false,
        position: "bottom-left",
      });

      try {
        await importFromJSON(file, (progressUpdate: ImportProgress) => {
          setProgress(progressUpdate);
          // Update the toast description with progress
          toast.update(progressToastId, {
            description: `${progressUpdate.phase}: ${progressUpdate.current}/${progressUpdate.total} (${progressUpdate.percentage}%)`,
          });
        });

        // Close progress toast and show success
        toast.close(progressToastId);
        toast({
          title: "Data imported successfully",
          description: "You can refresh the page to see your changes",
          status: "success",
          duration: 4000,
          isClosable: true,
          position: "bottom-left",
        });
      } catch (error) {
        // Close progress toast and show error
        toast.close(progressToastId);
        toast({
          title: "Failed to import data",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom-left",
        });
      } finally {
        setIsImporting(false);
        setProgress(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  }, [toast]);

  const handleFileInputChange = () => {
    fileInputRef.current?.click();
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Button
        onClick={handleFileInputChange}
        bg="accent.primary"
        color="white"
        _hover={{ bg: "accent.primary", opacity: 0.9 }}
        _active={{ bg: "accent.primary", opacity: 0.8 }}
        isLoading={isImporting}
        loadingText="Importing..."
        isDisabled={isImporting}
      >
        Import settings and data
      </Button>

      {progress && (
        <VStack align="stretch" spacing={2}>
          <Text fontSize="sm" color="text.secondary">
            {progress.phase}
          </Text>
          <Progress value={progress.percentage} colorScheme="red" size="sm" hasStripe isAnimated />
          <Text fontSize="xs" color="text.tertiary" textAlign="center">
            {progress.current} / {progress.total} ({progress.percentage}%)
          </Text>
        </VStack>
      )}

      <input type="file" accept=".json" style={{ display: "none" }} ref={fileInputRef} onChange={handleImportData} disabled={isImporting} />
    </VStack>
  );
};

export default Importer;
