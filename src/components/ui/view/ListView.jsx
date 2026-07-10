import React from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Card, CardFooter, CardTable } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

/**
 * Reusable List View Component
 * @param {Object} props
 * @param {Array} props.data - Array of items to display
 * @param {Array} props.columns - Column definitions for the table
 * @param {Object} props.pagination - Pagination state
 * @param {Function} props.onPaginationChange - Pagination change handler
 * @param {Boolean} props.enableSorting - Enable sorting (default: true)
 * @param {Boolean} props.enableFiltering - Enable filtering (default: true)
 */
export const ListView = ({
  data = [],
  columns = [],
  pagination = { pageIndex: 0, pageSize: 10 },
  onPaginationChange,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
}) => {
  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
  });

  return (
    <DataGrid table={table} recordCount={data.length}>
      <Card>
        <CardTable>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>

        {enablePagination && (
          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        )}
      </Card>
    </DataGrid>
  );
};
