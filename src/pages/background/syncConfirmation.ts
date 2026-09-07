import { setSession } from "@/api/sync/auth";
import { logger } from "@kitamersion/kita-logging";

export const handleSyncEmailConfirmed = async (rawPayload: string): Promise<{ status: "error" | "success"; message: string }> => {
  let payload;
  try {
    payload = JSON.parse(rawPayload);
  } catch (error) {
    logger.error(`Error parsing payload ${error}`);
    return { status: "error", message: "error parsing payload" };
  }

  const { error } = await setSession(payload.accessToken, payload.refreshToken);
  if (error) {
    logger.error(`Error establishing session from confirmation link: ${error}`);
    return { status: "error", message: error };
  }

  return { status: "success", message: "session established" };
};
