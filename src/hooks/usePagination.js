import { useState, useCallback } from 'react';

export const usePagination = (initialPage = 1, initialLimit = 10) => {
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [totalPages, setTotalPages] = useState(1);

  const goToPage = useCallback((pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
    }
  }, [totalPages]);

  const updatePagination = useCallback((pagination) => {
    setTotalPages(pagination.totalPages);
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    limit,
    totalPages,
    setPage,
    goToPage,
    updatePagination,
    reset,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

export default usePagination;
