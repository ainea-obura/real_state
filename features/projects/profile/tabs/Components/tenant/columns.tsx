import { Edit, Home, Trash2, User } from 'lucide-react';

import { DataTableColumnHeader } from '@/components/datatable/data-table-column-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnDef } from '@tanstack/react-table';

import { TenantAssignment } from '../schema/tenantSchema';

export const TenantAssignmentColumns = (
  onEdit: (row: TenantAssignment) => void,
  onDelete: (row: TenantAssignment) => void
): ColumnDef<TenantAssignment>[] => [
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
    accessorKey: "node",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Unit" />
    ),
    cell: ({ row }) => {
      const unit = row.original.node;
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {unit?.node_name} ({unit?.identifier})
            </span>
          </div>
          <div className="text-muted-foreground text-xs">
            {unit?.size} | {unit?.management_mode}
          </div>
          <div className="text-muted-foreground text-xs">
            Status: {unit?.status}
          </div>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "tenant_user",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tenant" />
    ),
    cell: ({ row }) => {
      const tenant = row.original.tenant_user;
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {tenant?.first_name} {tenant?.last_name}
            </span>
          </div>
          <div className="text-muted-foreground text-xs">{tenant?.email}</div>
          <div className="text-muted-foreground text-xs">{tenant?.phone}</div>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "rent_amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rent" />
    ),
    cell: ({ row }) => <span>{row.original.rent_amount}</span>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "contract_start",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Start" />
    ),
    cell: ({ row }) => <span>{row.original.contract_start}</span>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "contract_end",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="End" />
    ),
    cell: ({ row }) => <span>{row.original.contract_end}</span>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Edit assignment"
          tabIndex={0}
          role="button"
          onClick={() => onEdit(row.original)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="destructive"
          aria-label="Delete assignment"
          tabIndex={0}
          role="button"
          onClick={() => onDelete(row.original)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];
