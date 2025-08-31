"use client";
import { CircleX, Search } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { DataTableFacetedFilter } from './data-table-faceted-filter';

import type { Table } from "@tanstack/react-table";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  tableKey: string;
  searchableColumnIds: string[];
  searchableColumnsSetters: ((value: string) => void)[];
  options?: { label: string; value: string }[];
  actionButton?: React.ReactNode;
  isUpper?: boolean;
  searchPlaceholder?: string;
}

const DataTableToolbar = <TData,>({
  table,
  searchableColumnsSetters,
  options = [],
  actionButton,
  searchPlaceholder = "Search...",
}: DataTableToolbarProps<TData>) => {
  // ▶️ Local input state
  const [inputValue, setInputValue] = useState("");

  // ▶️ Show Reset if any text‐filter is applied
  const showReset = inputValue.trim().length > 0;

  // 1️⃣ Perform search: update each column setter (writes to relevant atoms)
  const handleSearch = useCallback(() => {
    searchableColumnsSetters.forEach((setter) => setter(inputValue));
  }, [inputValue, searchableColumnsSetters]);

  // 2️⃣ Reset: clear **all** filters and clear the input
  const handleReset = useCallback(() => {
    table.resetColumnFilters();
    searchableColumnsSetters.forEach((setter) => setter(""));
    setInputValue("");
  }, [table, searchableColumnsSetters]);

  return (
    <div className="flex md:flex-row flex-col justify-between items-center gap-4 mt-5 w-full">
      <div className="flex flex-wrap flex-1 items-center gap-2">
        <div className="flex items-center gap-2">
          {/* Text input */}
          <Input
            placeholder={searchPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full lg:w-[400px] h-10"
          />

          {/* Search button */}
          <Button onClick={handleSearch} className="h-10">
            <Search className="mr-2" /> Search
          </Button>
        </div>

        {/* Status facet filter */}
        {options.length > 0 && (() => {
          const statusColumn = table.getColumn("status");
          return statusColumn ? (
            <DataTableFacetedFilter
              column={statusColumn}
              title="Status"
              options={options}
            />
          ) : null;
        })()}

        {/* Reset button */}
        {showReset && (
          <Button
            variant="ghost"
            onClick={handleReset}
            className="px-2 lg:px-3 border border-dashed"
          >
            Reset <CircleX className="ml-2 w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Action button */}
      <div className="flex items-center gap-2">{actionButton}</div>
    </div>
  );
};

export default DataTableToolbar;
