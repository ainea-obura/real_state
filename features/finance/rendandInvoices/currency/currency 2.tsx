import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/features/clients/tabs/components";
import { Plus } from "lucide-react";
import CurrencyStatCards from "./components/CurrencyStatCards";
import CreateCurrencyModal from "./components/CreateCurrencyModal";
import EditCurrencyModal from "./components/EditCurrencyModal";
import DeleteCurrencyDialog from "./components/DeleteCurrencyDialog";
import SetDefaultCurrencyDialog from "./components/SetDefaultCurrencyDialog";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCurrencyStats,
  fetchCurrencyTable,
} from "@/actions/finance/currency";
import { useAtom } from "jotai";
import { pageIndexAtom, pageSizeAtom } from "@/store";
import { columns } from "./components/columns";
import { DataTable } from "@/components/datatable/data-table";
import { Currency } from "./schema/types";
import { PermissionGate } from "@/components/PermissionGate";

const CurrencyTab = () => {
  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCurrency, setEditCurrency] = useState<Currency | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCurrency, setDeleteCurrency] = useState<Currency | null>(null);
  const [setDefaultOpen, setSetDefaultOpen] = useState(false);
  const [setDefaultCurrency, setSetDefaultCurrency] = useState<Currency | null>(
    null
  );

  // Pagination state from jotai
  const [pageIndex, setPageIndex] = useAtom(pageIndexAtom);
  const [pageSize, setPageSize] = useAtom(pageSizeAtom);

  // Fetch currency stats from API
  const {
    data: currencyStats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["currency-stats"],
    queryFn: fetchCurrencyStats,
  });

  // Fetch currency table from API and log changes to page and pageSize
  const {
    data: currencyTable = { count: 0, results: [] },
    isLoading: isTableLoading,
    isError: isTableError,
    error: tableError,
    refetch: refetchTable,
  } = useQuery({
    queryKey: ["currencies", pageIndex, pageSize],
    queryFn: () => {
      return fetchCurrencyTable({ page: pageIndex + 1, pageSize });
    },
  });

  // Handlers
  const handleCreate = () => {
    setCreateOpen(false);
    refetchTable();
    refetchStats();
  };
  const handleEdit = () => {
    setEditOpen(false);
    refetchTable();
    refetchStats();
  };
  const handleDelete = () => {
    setDeleteOpen(false);
    refetchTable();
    refetchStats();
  };
  const handleSetDefault = () => {
    refetchTable();
    refetchStats();
  };

  return (
    <div className="space-y-6">
      <Header
        title="Currencies"
        description="Manage supported currencies for invoices and transactions"
      >
        <div className="flex gap-3 items-center">
          <PermissionGate codename="add_currency" showFallback={false}>
            <Button className="h-10" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 w-4 h-4" />
              Add Currency
            </Button>
          </PermissionGate>
        </div>
      </Header>
      {isStatsLoading ? (
        <div className="flex justify-center items-center h-24 text-muted-foreground">
          Loading stats...
        </div>
      ) : isStatsError ? (
        <div className="flex justify-center items-center h-24 text-destructive">
          {statsError?.message || "Failed to load stats"}
        </div>
      ) : (
        <CurrencyStatCards stats={currencyStats} />
      )}
      {isTableLoading ? (
        <div className="flex justify-center items-center h-24 text-muted-foreground">
          Loading currencies...
        </div>
      ) : isTableError ? (
        <div className="flex justify-center items-center h-24 text-destructive">
          {tableError?.message || "Failed to load currencies"}
        </div>
      ) : (
        <DataTable
          columns={columns({
            onEdit: (currency) => {
              setEditCurrency(currency);
              setEditOpen(true);
            },
            onDelete: (currency) => {
              setDeleteCurrency(currency);
              setDeleteOpen(true);
            },
            onSetDefault: (currency) => {
              setSetDefaultCurrency(currency);
              setSetDefaultOpen(true);
            },
          })}
          data={{ data: currencyTable }}
          isLoading={isTableLoading}
          isError={isTableError}
          options={[]}
          tableKey="currencies"
          searchableColumnIds={["name", "code", "symbol"]}
          searchableColumnsSetters={[() => {}]}
          isUpper={false}
        />
      )}
      <CreateCurrencyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <EditCurrencyModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        currency={editCurrency}
        onEdit={handleEdit}
      />
      <DeleteCurrencyDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        currency={deleteCurrency}
        onDelete={handleDelete}
      />
      <SetDefaultCurrencyDialog
        open={setDefaultOpen}
        onClose={() => setSetDefaultOpen(false)}
        currency={setDefaultCurrency}
        onSetDefault={() => {
          refetchTable();
          refetchStats();
        }}
      />
    </div>
  );
};

export default CurrencyTab;
