import { useState, useEffect, useCallback } from "react";
import IndexedDB from "@/db/index";
import { IPaginatedVideos } from "@/types/video";

const DEFAULT_PAGE_SIZE = 20;

export function useVideoPagination(pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const [paginatedResult, setPaginatedResult] = useState<IPaginatedVideos>({
    page: 0,
    pageSize: 0,
    results: [],
    totalPages: 0,
  });

  const getVideoPagination = useCallback(async () => {
    const result = await IndexedDB.getVideosByPagination(page, pageSize);
    setPaginatedResult(result);
  }, [page, pageSize]);

  useEffect(() => {
    getVideoPagination();
  }, [getVideoPagination]);

  const handleNext = () => {
    if (page < paginatedResult.totalPages - 1) {
      setPage(page + 1);
    }
  };

  const handlePrevious = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  return { page, paginatedResult, handleNext, handlePrevious };
}
