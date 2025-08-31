import { Checkbox } from '@/components/ui/checkbox';
import { ColumnDef } from '@tanstack/react-table';

import { money } from './tableUtils';

// Outstanding Payments interface
export interface OutstandingPayment {
  id: string;
  invoiceNumber: string;
  paymentNumber: string;
  buyer: string;
  buyerPhone: string;
  buyerEmail: string;
  projectName: string;
  propertyInfo: string;
  salesperson: string;
  salespersonPhone: string;
  salespersonEmail: string;
  dueDate: string;
  daysOverdue: number;
  amount: number;
  followUpStatus: string;
  lastReminder: string;
}

// Outstanding Payments & Follow-ups columns
export const outstandingPaymentsColumns: ColumnDef<OutstandingPayment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "invoiceNumber",
    header: "Invoice # / Payment",
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-sm">
          Invoice: {row.original.invoiceNumber}
        </div>
        <div className="text-gray-600 text-xs">
          {row.original.paymentNumber}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "buyer",
    header: "Buyer",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.buyer}</div>
        <div className="text-gray-600 text-sm">{row.original.buyerPhone}</div>
        <div className="text-gray-600 text-sm">{row.original.buyerEmail}</div>
      </div>
    ),
  },
  {
    accessorKey: "projectName",
    header: "Property",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.projectName}</div>
        <div className="text-gray-600 text-sm">{row.original.propertyInfo}</div>
      </div>
    ),
  },
  {
    accessorKey: "salesperson",
    header: "Salesperson",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.salesperson}</div>
        <div className="text-gray-600 text-sm">
          {row.original.salespersonPhone}
        </div>
        <div className="text-gray-600 text-sm">
          {row.original.salespersonEmail}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date / Days Overdue",
    cell: ({ row }) => (
      <div>
        <div>{row.original.dueDate}</div>
        <div className="font-semibold text-red-600 text-sm">
          {row.original.daysOverdue} days overdue
        </div>
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number;
      return <div className="font-semibold">{money(amount)}</div>;
    },
  },
  {
    accessorKey: "lastReminder",
    header: "Last Reminder",
    cell: ({ row }) => <div>{row.original.lastReminder}</div>,
  },
];
