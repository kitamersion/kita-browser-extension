import { logger } from "@kitamersion/kita-logging";
import { KitaSchema } from "@/types/kitaschema";
import { getKitaSchema } from "@/api/schemaGenerator";

const exportToJSON = async (fileName: string): Promise<KitaSchema | null> => {
  try {
    await logger.info("exporting...");
    const data = await getKitaSchema();

    // Create and download the file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    // cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return data;
  } catch (error) {
    await logger.error(`Export failed: ${error}`);
    throw error;
  }
};

export { exportToJSON };
