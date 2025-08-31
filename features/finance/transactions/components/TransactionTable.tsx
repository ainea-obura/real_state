import { Eye } from 'lucide-react';

import { DataTable } from '@/components/datatable/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnDef } from '@tanstack/react-table';

import type { Transaction } from "@/features/finance/transactions/schema";

function formatCurrency(amount: string) {
  return amount;
}

function formatDate(date: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
}

// Status color map
const statusColors: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  PARTIAL: "bg-blue-100 text-blue-800",
  ISSUED: "bg-gray-100 text-gray-800",
  // Add more as needed
};

const TYPE_OPTIONS = [
  { label: "Rent", value: "Rent" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Utility", value: "Utility" },
  { label: "Deposit", value: "Deposit" },
  { label: "Late Fee", value: "Late Fee" },
  { label: "Salary", value: "Salary" },
  { label: "Management Fee", value: "Management Fee" },
  { label: "Cleaning", value: "Cleaning" },
  { label: "Other", value: "Other" },
];

function getActiveParty(
  tx: Transaction
): { name: string; type: string } | null {
  if (tx.tenant) return { name: tx.tenant.name, type: "Tenant" };
  if (tx.owners && tx.owners.length > 0)
    return { name: tx.owners[0].name, type: "Owner" };
  if (tx.vendors && tx.vendors.length > 0)
    return { name: tx.vendors[0].name, type: "Vendor" };
  return null;
}

const typeDescriptions = {
  PV: (tx: Transaction) => {
    if (tx.vendors && tx.vendors.length > 0)
      return "Outgoing payment to\nVendor";
    if (tx.owners && tx.owners.length > 0) return "Outgoing payment to\nOwner";
    return "Outgoing payment";
  },
  RV: () => "Incoming payment from\nTenant",
  INV: () => "Invoice issued to\nTenant",
};

function getAmountColor(amount: string) {
  const num = Number((amount || "").replace(/[^\d.-]+/g, ""));
  if (num > 0) return "text-green-600";
  if (num < 0) return "text-red-600";
  return "text-gray-700";
}

const TransactionTable = ({
  data,
  onView,
}: {
  data: Transaction[];
  onView: (tx: Transaction) => void;
}) => {
  // DataTable expects { data: { count, results } }
  const tableData = {
    data: {
      count: data.length,
      results: data,
    },
  };

  const columns: ColumnDef<Transaction, unknown>[] = [
    {
      id: "select",
      header: () => null,
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={row.getToggleSelectedHandler()}
          aria-label="Select transaction"
        />
      ),
      enableSorting: false,
      size: 32,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "party",
      header: "Name",
      cell: ({ row }) => {
        const tx = row.original;
        const party = getActiveParty(tx);
        let email = "";
        let phone = "";
        if (party) {
          if (party.type === "Tenant" && tx.tenant) {
            email = tx.tenant.email;
            phone = tx.tenant.phone;
          } else if (
            party.type === "Owner" &&
            tx.owners &&
            tx.owners.length > 0
          ) {
            email = tx.owners[0].email;
            phone = tx.owners[0].phone;
          } else if (
            party.type === "Vendor" &&
            tx.vendors &&
            tx.vendors.length > 0
          ) {
            email = tx.vendors[0].email;
            phone = tx.vendors[0].phone;
          }
        }
        return party ? (
          <div>
            <div className="flex gap-4 items-center font-medium">
              {party.name}
              <Badge className="ml-1" variant="outline">
                {party.type}
              </Badge>
            </div>
            {(email || phone) && (
              <div className="flex flex-col gap-2 mt-2 text-xs">
                {email && <span>Email: {email}</span>}
                {phone && <span>Phone: {phone}</span>}
              </div>
            )}
          </div>
        ) : (
          <span className="">—</span>
        );
      },
    },
    {
      accessorKey: "property",
      header: "Property",
      cell: ({ row }) => {
        const prop = row.original.property || "—";
        const parts = prop
          .split("/")
          .map((s) => s.trim())
          .filter(Boolean);
        const main = parts.length > 0 ? parts[parts.length - 1] : prop;
        const sub = parts.length > 1 ? parts.slice(0, -1).join(" - ") : null;
        return (
          <div>
            <span className="font-medium">{main}</span>
            {sub && (
              <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 120,
      cell: ({ row }) => {
        const tx = row.original;
        const code = tx.type;
        const descFn = typeDescriptions[code as keyof typeof typeDescriptions];
        const desc = descFn ? descFn(tx) : code;
        return (
          <div className="w-28 break-words">
            <span className="text-sm font-bold">{code}</span>
            <span className="block mt-1 text-xs whitespace-pre-line text-muted-foreground">
              {desc}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const color = getAmountColor(row.original.amount);
        return (
          <span className={`block font-mono text-left ${color}`}>
            {formatCurrency(row.original.amount)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = String(row.original.status || "").toUpperCase();
        const color = statusColors[status] || "bg-gray-100 text-gray-800";
        return <Badge className={color}>{row.original.status}</Badge>;
      },
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => row.original.method || "—",
    },
    // {
    //   id: "actions",
    //   header: "Action",
    //   cell: ({ row }) => (
    //     <Button
    //       size="sm"
    //       variant="ghost"
    //       className="gap-1"
    //       onClick={() => onView(row.original)}
    //     >
    //       <Eye className="mr-1 w-4 h-4" />
    //       View
    //     </Button>
    //   ),
    //   enableSorting: false,
    // },
  ];

  return (
    <DataTable
      columns={columns}
      data={tableData}
      isLoading={false}
      isError={false}
      options={TYPE_OPTIONS}
      tableKey="transactions-table"
      searchableColumnsSetters={[]}
      searchableColumnIds={["type"]}
    />
  );
};

export default TransactionTable;
