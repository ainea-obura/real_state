"use client";
import { useAtom } from 'jotai';
import { useCallback, useMemo, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { pageIndexAtom, pageSizeAtom } from '@/store';
import {
    ColumnDef, ColumnFiltersState, flexRender, getCoreRowModel, getFilteredRowModel,
    getSortedRowModel, SortingState, useReactTable,
} from '@tanstack/react-table';

import { DataTablePagination } from './data-table-pagination';
import DataTableToolbar from './data-table-toolbar';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: {
    error?: boolean;
    data?: {
      count: number;
      results: TData[];
    };
  };
  isLoading: boolean;
  isError: boolean;
  options: {
    label: string;
    value: string;
  }[];
  tableKey: string;
  errorMessage?: string;
  searchableColumnIds?: string[];
  actionButton?: React.ReactNode;
  searchableColumnsSetters: ((value: string) => void)[];
  isUpper?: boolean;
  searchPlaceholder?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  isError,
  options,
  errorMessage,
  searchableColumnIds,
  actionButton,
  searchableColumnsSetters,
  isUpper = false,
  tableKey,
  searchPlaceholder,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  // pagination & page ise Status
  const [pageIndex, setPageIndex] = useAtom(pageIndexAtom);
  const [pageSize, setPageSize] = useAtom(pageSizeAtom);

  const tableData = useMemo<TData[]>(
    () => (!isLoading && !isError ? data?.data?.results || [] : []),
    [data, isLoading, isError]
  );

  // pagination page count
  const totalCount = data?.data?.count || 0;
  const pageCount = useMemo(
    () => Math.ceil(totalCount / pageSize),
    [totalCount, pageSize]
  );

  // Define type for pagination state
  type PaginationState = {
    pageIndex: number;
    pageSize: number;
  };

  // Define type for pagination updater
  type PaginationUpdater =
    | ((old: PaginationState) => PaginationState)
    | Partial<PaginationState>;

  // stable callback for handling pagination changes
  const onPaginationChange = useCallback(
    (updater: PaginationUpdater) => {
      if (typeof updater === "function") {
        const old = { pageIndex, pageSize };
        const newState = updater(old);
        if (newState.pageIndex !== undefined) setPageIndex(newState.pageIndex);
        if (newState.pageSize !== undefined) setPageSize(newState.pageSize);
      } else {
        if (updater.pageIndex !== undefined) setPageIndex(updater.pageIndex);
        if (updater.pageSize !== undefined) setPageSize(updater.pageSize);
      }
    },
    [pageIndex, pageSize, setPageIndex, setPageSize]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      rowSelection,
      columnFilters,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    manualPagination: true,
    pageCount,
    onPaginationChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
  });

  return (
    <div className="space-y-4 !pb-8 w-full">
      {/* TODO: Update options to be props and seachble columns and placeholder */}
      <DataTableToolbar
        table={table}
        searchableColumnsSetters={searchableColumnsSetters}
        options={options}
        searchableColumnIds={searchableColumnIds || []}
        actionButton={actionButton}
        isUpper={isUpper}
        tableKey={tableKey}
        searchPlaceholder={searchPlaceholder}
      />

      <div className="border rounded-md w-full overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="bg-blue-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className="!font-poppins text-black"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 !font-poppins text-center"
                >
                  <span className="text-red-500 text-lg">
                    {errorMessage ?? "Error Failed to load data"}
                  </span>
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              // Render a few skeleton rows
              [...Array(10)].map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex} className="p-4">
                      <Skeleton className="w-full h-5" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-4 py-3 !font-poppins"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && !isError && table.getRowModel().rows?.length > 0 && (
        <DataTablePagination table={table} />
      )}
    </div>
  );
}
