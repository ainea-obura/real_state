import { useState } from "react";
import { DataTable } from "@/components/datatable/data-table";
import { columns } from "./columns";
import { mockCurrencies } from "./mockData";
import { Currency } from "../schema/types";

interface CurrencyTableProps {
  onEdit: (currency: Currency) => void;
  onDelete: (currency: Currency) => void;
  onSetDefault: (currency: Currency) => void;
}

const PAGE_SIZE = 5;

const CurrencyTable = ({ onEdit, onDelete, onSetDefault }: CurrencyTableProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  // Pagination logic (mock)
  const pagedData = mockCurrencies.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );

  return (
    <DataTable
      columns={columns({ onEdit, onDelete, onSetDefault })}
      data={{ data: { count: mockCurrencies.length, results: pagedData } }}
      isLoading={false}
      isError={false}
      options={[]}
      tableKey="currencies"
      // Remove pageIndex/pageSize if not supported by DataTable
      searchableColumnIds={["name", "code", "symbol"]}
      searchableColumnsSetters={[() => {}]}
      isUpper={false}
    />
  );
};

export default CurrencyTable; 