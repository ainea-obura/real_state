import { Checkbox } from '@/components/ui/checkbox';
import { ColumnDef } from '@tanstack/react-table';

import { money } from './tableUtils';

// Agent Payouts interface
export interface AgentPayout {
  id: string;
  agent: {
    name: string;
    phone: string;
    email: string;
  };
  projectName: string;
  propertyInfo: string;
  pending: number;
  paid: number;
  paidDate: string;
  expenses: number;
  netPending: number;
  netPaid: number;
}

// Agent Payouts Summary columns - Updated
export const agentPayoutsColumns: ColumnDef<AgentPayout>[] = [
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
    accessorKey: "agent",
    header: "Agent",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.agent.name}</div>
        <div className="text-gray-600 text-sm">{row.original.agent.phone}</div>
        <div className="text-gray-600 text-sm">{row.original.agent.email}</div>
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
    accessorKey: "pending",
    header: "Pending",
    cell: ({ row }) => (
      <div>
        <div className="font-semibold text-orange-600">
          {money(row.getValue("pending"))}
        </div>
        <div className="text-gray-600 text-sm">
          Billed: {money(row.original.expenses)}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "paid",
    header: "Paid",
    cell: ({ row }) => (
      <div className="font-semibold text-green-600">
        {money(row.getValue("paid"))}
      </div>
    ),
  },
  {
    id: "balance",
    header: "Net Balance",
    cell: ({ row }) => {
      const netPending = row.getValue("netPending") as number;
      const netPaid = row.getValue("netPaid") as number;
      const balance = netPending - netPaid;
      return (
        <div
          className={`font-semibold ${
            balance > 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          {money(balance)}
        </div>
      );
    },
  },
  {
    accessorKey: "paidDate",
    header: "Paid Date",
    cell: ({ row }) => <div>{row.getValue("paidDate")}</div>,
  },
];
