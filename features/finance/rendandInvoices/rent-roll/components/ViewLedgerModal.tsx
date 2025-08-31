import { useMemo } from 'react';

import { fetchUnitLedger } from '@/actions/finance/rent-roll';
import { DataTable } from '@/components/datatable/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { LedgerTransaction } from '@/features/finance/rendandInvoices/rent-roll/schema';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, Row, Table } from '@tanstack/react-table';

interface ViewLedgerModalProps {
  open: boolean;
  onClose: () => void;
  unit: {
    id: string; // Add unit ID for API call
    tenantName: string;
    unit: string;
    projectName: string;
  };
}

const columns: ColumnDef<LedgerTransaction & { isLast?: boolean }>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select row ${row.index + 1}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <span className="font-mono">
        {new Date(row.original.date).toLocaleDateString()}
      </span>
    ),
  },
  {
    accessorKey: "invoice",
    header: "Invoice #",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.invoice}</span>
    ),
  },
  {
    accessorKey: "rv",
    header: "RV #",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.rv || "-"}</span>
    ),
  },
  {
    accessorKey: "payer_name",
    header: "Payer",
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="font-medium">{row.original.payer_name || "-"}</div>
        {row.original.payer_email && (
          <div className="text-gray-500 text-xs">
            {row.original.payer_email}
          </div>
        )}
      </div>
    ),
  },

  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span
        className="block max-w-xs truncate"
        title={row.original.description}
      >
        {row.original.description}
      </span>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    cell: ({ row }) => <span>{row.original.method}</span>,
  },
  {
    accessorKey: "debit",
    header: "Debit",
    cell: ({ row }) => {
      const debit = row.original.debit;
      // Check if debit is not "KES 0" or empty
      return debit && debit !== "KES 0" ? (
        <span className="font-semibold text-red-600">{debit}</span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    accessorKey: "credit",
    header: "Credit",
    cell: ({ row }) => {
      const credit = row.original.credit;
      // Check if credit is not "KES 0" or empty
      return credit && credit !== "KES 0" ? (
        <span className="font-semibold text-green-600">{credit}</span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => {
      const balance = row.original.balance;
      
      // Parse the balance to determine if money is owed
      const balanceAmount = parseFloat(balance.replace("KES ", "").replace(",", "")) || 0;
      const isMoneyOwed = balanceAmount > 0; // Positive balance means money is owed

      return (
        <span
          className={`font-bold ${
            isMoneyOwed ? "text-red-600" : "text-green-600"
          }`}
        >
          {balance}
        </span>
      );
    },
  },
];

const ViewLedgerModal = ({ open, onClose, unit }: ViewLedgerModalProps) => {
  // Fetch ledger data using React Query
  const {
    data: ledgerData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["ledger", unit.id],
    queryFn: () => fetchUnitLedger(unit.id),
    enabled: open && !!unit.id, // Only fetch when modal is open and unit ID exists
  });

  // Debug logging
  
  
  
  

  // Process data for table
  const tableData = useMemo(() => {
    if (!ledgerData?.results || ledgerData.results.length === 0) {
      
      return [];
    }

    

    // Sort by date
    const sortedData = [...ledgerData.results].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    

    // Mark last row for balance display
    const processedData = sortedData.map((row, idx) =>
      idx === sortedData.length - 1
        ? { ...row, isLast: true }
        : { ...row, isLast: false }
    );

    
    return processedData;
  }, [ledgerData]);

  const data = useMemo(
    () => ({
      data: {
        count: tableData.length,
        results: tableData,
      },
    }),
    [tableData]
  );

  

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-7xl">
        <DialogHeader>
          <DialogTitle>Payment Ledger</DialogTitle>
        </DialogHeader>
        <div className="mb-2 text-gray-600 text-sm">
          Tenant: <span className="font-medium">{unit.tenantName}</span> | Unit:{" "}
          {unit.unit} ({unit.projectName})
        </div>
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            isError={isError}
            options={[]}
            tableKey="ledger-modal"
            errorMessage={error?.message || "No transactions found."}
            searchableColumnIds={[]}
            searchableColumnsSetters={[]}
            isUpper={false}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewLedgerModal;
