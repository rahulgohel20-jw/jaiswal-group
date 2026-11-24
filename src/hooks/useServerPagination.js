import { useState, useCallback, useMemo } from 'react';

/**
 * Reusable hook for server-side paginated tables with TanStack Table and DataGrid.
 *
 * @param {Object} options
 * @param {number} [options.defaultPageSize=10]
 * @returns {Object}
 */
export function useServerPagination({ defaultPageSize = 10 } = {}) {
  const [pagination, setPaginationState] = useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const setPagination = useCallback((updater) => {
    setPaginationState((old) => {
      const next = typeof updater === 'function' ? updater(old) : updater;
      if (next.pageSize !== old.pageSize) {
        return { ...next, pageIndex: 0 };
      }
      return next;
    });
  }, []);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  /**
   * Updates totalElements and totalPages from a backend paginated response.
   * Supports Spring Data REST structures ({ data, totalPages, totalElements })
   * as well as standard variants ({ totalRecords, total, content }).
   */
  const updateFromResponse = useCallback(
    (response, fallbackLength = 0) => {
      const body = response?.data || response || {};
      const total = Number(
        body.totalElements ??
          body.totalRecords ??
          body.total ??
          (Array.isArray(body.data)
            ? body.data.length
            : Array.isArray(body.content)
            ? body.content.length
            : fallbackLength) ??
          0
      );

      const calculatedPages = Math.max(1, Math.ceil(total / (pagination.pageSize || 10)));
      const pages = Number(body.totalPages ?? calculatedPages);

      setTotalElements(total);
      setTotalPages(pages);

      return { total, pages };
    },
    [pagination.pageSize]
  );

  /**
   * Resets the current page to the first page (0-indexed).
   * Typically called when search queries or filters change.
   */
  const resetPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const pageCount = useMemo(() => {
    if (totalPages > 0) return totalPages;
    return Math.max(1, Math.ceil(totalElements / (pagination.pageSize || 10)));
  }, [totalPages, totalElements, pagination.pageSize]);

  return {
    pagination,
    setPagination,
    totalElements,
    setTotalElements,
    totalPages,
    setTotalPages,
    pageCount,
    updateFromResponse,
    resetPage,
    // Convenience props for <DataGrid recordCount={...}>
    recordCount: totalElements,
    // Pre-built config to spread into useReactTable
    tablePaginationProps: {
      manualPagination: true,
      pageCount,
      state: { pagination },
      onPaginationChange: setPagination,
    },
  };
}

export default useServerPagination;
