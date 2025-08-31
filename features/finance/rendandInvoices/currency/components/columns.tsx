import { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Star, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Currency } from "../schema/types";
import { PermissionGate } from "@/components/PermissionGate";

export const columns = ({
  onEdit,
  onDelete,
  onSetDefault,
}: {
  onEdit: (currency: Currency) => void;
  onDelete: (currency: Currency) => void;
  onSetDefault: (currency: Currency) => void;
}): ColumnDef<Currency>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => row.original.code,
  },
  {
    accessorKey: "symbol",
    header: "Symbol",
    cell: ({ row }) => row.original.symbol,
  },
  {
    accessorKey: "decimalPlaces",
    header: "Decimals",
    cell: ({ row }) => row.original.decimalPlaces,
  },
  {
    accessorKey: "usageCount",
    header: "Usage",
    cell: ({ row }) => row.original.usageCount ?? 0,
  },
  {
    accessorKey: "isDefault",
    header: "Default",
    cell: ({ row }) =>
      row.original.isDefault ? (
        <Star className="w-4 h-4 text-yellow-500" />
      ) : null,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const currency = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 w-8 h-8">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
              <PermissionGate codename="edit_currency" showFallback={false}>
              <DropdownMenuItem onClick={() => onEdit(currency)}>
                <Pencil className="mr-2 w-4 h-4" />
                Edit
              </DropdownMenuItem>
            </PermissionGate>
            <PermissionGate codename="delete_currency" showFallback={false}>
              <DropdownMenuItem onClick={() => onDelete(currency)}>
                <Trash2 className="mr-2 w-4 h-4 text-destructive" />
                Delete
              </DropdownMenuItem>
            </PermissionGate>
            {!currency.isDefault && (
              <PermissionGate codename="edit_currency" showFallback={false}>
                <DropdownMenuItem onClick={() => onSetDefault(currency)}>
                  <Star className="mr-2 w-4 h-4 text-yellow-500" />
                  Set as Default
                </DropdownMenuItem>
              </PermissionGate>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
]; 