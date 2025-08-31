import { ColumnDef } from "@tanstack/react-table";
import { Vendor } from "../schema/vendorSchema";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";

interface CreateColumnsProps {
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
}

export const createColumns = ({ onEdit, onDelete }: CreateColumnsProps): ColumnDef<Vendor, any>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email,
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.original.phone || "-",
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => row.original.type === "company" ? "Company" : "Individual",
  },
  {
    accessorKey: "totalExpenses",
    header: "Total Expenses",
    cell: ({ row }) => `${row.original.totalExpenses || 0}`,
  },
  {
    accessorKey: "expenseCount",
    header: "# Expenses",
    cell: ({ row }) => row.original.expenseCount,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <PermissionGate codename="edit_vendors" showFallback={false}>
          <Button size="icon" variant="ghost" onClick={() => onEdit(row.original)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </PermissionGate>
        <PermissionGate codename="delete_vendors" showFallback={false}>
          <Button size="icon" variant="ghost" onClick={() => onDelete(row.original)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </PermissionGate>
      </div>
    ),
  },
]; 