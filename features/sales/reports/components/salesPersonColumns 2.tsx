import { Checkbox } from '@/components/ui/checkbox';
import { ColumnDef } from '@tanstack/react-table';

import { formatPercent, money } from './tableUtils';

export interface SalesPerson {
  id: string;
  name: string;
  employee_id: string;
  email: string;
  phone: string;
  contracted: number;
  offersSent: number;
  won: number;
  lost: number;
  conversionPercent: number;
  avgDealSize: number;
  revenue: number;
}

export const columns: ColumnDef<SalesPerson>[] = [
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
    accessorKey: "name",
    header: "Salesperson",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-gray-600 text-sm">{row.original.email}</div>
        <div className="text-gray-600 text-sm">{row.original.phone}</div>
      </div>
    ),
  },
  {
    accessorKey: "contracted",
    header: "Contracted",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("contracted")}</div>
    ),
  },
  {
    accessorKey: "offersSent",
    header: "Offers Sent",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("offersSent")}</div>
    ),
  },
  {
    accessorKey: "won",
    header: "Won",
    cell: ({ row }) => (
      <div className="font-semibold text-green-600 text-center">
        {row.getValue("won")}
      </div>
    ),
  },
  {
    accessorKey: "lost",
    header: "Lost",
    cell: ({ row }) => (
      <div className="font-semibold text-red-600 text-center">
        {row.getValue("lost")}
      </div>
    ),
  },
  {
    accessorKey: "conversionPercent",
    header: "Conversion %",
    cell: ({ row }) => (
      <div className="font-semibold text-center">
        {formatPercent(row.getValue("conversionPercent"))}
      </div>
    ),
  },
  {
    accessorKey: "avgDealSize",
    header: "Avg Deal Size",
    cell: ({ row }) => (
      <div className="text-center">{money(row.getValue("avgDealSize"))}</div>
    ),
  },
  {
    accessorKey: "revenue",
    header: "Revenue",
    cell: ({ row }) => (
      <div className="font-semibold text-green-600 text-center">
        {money(row.getValue("revenue"))}
      </div>
    ),
  },
];
