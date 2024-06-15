import { getMyAnimeListAuth } from "@/api/integration/myanimelist";
import logger from "@/config/logger";
import { KITA_AUTH_PROXY_URL } from "@/data/contants";
import { useState, useEffect, useCallback } from "react";

const useFetch = <T,>(
  path: string,
  isAuthorized: boolean
): { data: T | null; loading: boolean; error: string | null; manualFetch: () => void } => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      getMyAnimeListAuth(async (auth) => {
        const response = await fetch(`${KITA_AUTH_PROXY_URL}${path}`, {
          headers: {
            mal_token: `${auth?.access_token}`,
          },
        });
        const data: T = await response.json();
        setData(data);
      });
    } catch (error) {
      setError(error as string);
      logger.error(`Error fetching data: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized, path]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, manualFetch: fetchData };
};

export default useFetch;
