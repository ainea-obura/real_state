"use client"
import { DataTable } from "@/components/datatable/data-table"
import { currencyColumns, RowCurrency } from "./columns"
import { Currency } from "./types"

interface CurrencyTableProps {
  data: RowCurrency[]
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  onEdit: (currency: Currency) => void
  onDelete: (currency: Currency) => void
  onSetDefault: (currency: Currency) => void
}

export function CurrencyTable({
  data,
  page,
  pageCount,
  onPageChange,
  onEdit,
  onDelete,
  onSetDefault,
}: CurrencyTableProps) {
  // Attach action handlers to each row
  const rows: RowCurrency[] = data.map((c) => ({
    ...c,
    onEdit,
    onDelete,
    onSetDefault,
  }))

  return (
    <DataTable
      columns={currencyColumns}
      data={rows}
      page={page}
      pageCount={pageCount}
      onPageChange={onPageChange}
      searchPlaceholder="Search currencies..."
    />
  )
} 