"use client";
import { Row } from "@tanstack/react-table";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  renderActions: (row: Row<TData>) => React.ReactNode;
}

export function DataTableRowActions<TData>({
  row,
  renderActions,
}: DataTableRowActionsProps<TData>) {
  return (
    <div className="flex justify-center items-center w-full">
      {renderActions(row)}
    </div>
  );
}
