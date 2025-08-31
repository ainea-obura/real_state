import { Delete02Icon } from "hugeicons-react";
import { Building2, Eye, FolderPen, Trash2 } from "lucide-react";
import { useState } from "react";

import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";

import type { PositionTableItem } from "../../schema/position";

// Mock data for demonstration
const mockPositions: PositionTableItem[] = [
  {
    id: "1",
    name: "Property Manager",
    description: "Manages day-to-day operations of properties including tenant relations, maintenance, and financial oversight.",
    is_deleted: false,
    created_at: "2024-01-15T10:30:00Z",
    modified_at: "2024-01-15T10:30:00Z",
  },
  {
    id: "2", 
    name: "Maintenance Technician",
    description: "Handles repairs, maintenance, and technical issues across all properties.",
    is_deleted: false,
    created_at: "2024-01-16T14:20:00Z",
    modified_at: "2024-01-16T14:20:00Z",
  },
  {
    id: "3",
    name: "Accountant",
    description: "Manages financial records, rent collection, expense tracking, and financial reporting.",
    is_deleted: false,
    created_at: "2024-01-17T09:15:00Z",
    modified_at: "2024-01-17T09:15:00Z",
  },
  {
    id: "4",
    name: "Leasing Agent",
    description: "Handles tenant acquisition, property showings, lease negotiations, and tenant screening.",
    is_deleted: false,
    created_at: "2024-01-18T11:45:00Z",
    modified_at: "2024-01-18T11:45:00Z",
  },
  {
    id: "5",
    name: "Security Guard",
    description: "Provides security services, monitors properties, and ensures tenant safety.",
    is_deleted: false,
    created_at: "2024-01-19T16:30:00Z",
    modified_at: "2024-01-19T16:30:00Z",
  },
];

export const PositionsColumns: ColumnDef<PositionTableItem>[] = [
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
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Position Name" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <Building2 className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {row.original.name}
            </span>
          </div>
          {row.original.description ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-gray-500 text-sm max-w-[300px] truncate cursor-help">
                    {row.original.description.length > 30 
                      ? `${row.original.description.substring(0, 30)}...` 
                      : row.original.description
                    }
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[300px]">
                  <p className="text-sm">{row.original.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="text-gray-400 text-sm italic">
              No description provided
            </div>
          )}
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created Date" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return (
        <span className="text-gray-900">
          {date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "modified_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Modified" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.modified_at);
      return (
        <span className="text-gray-900">
          {date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const position = row.original;

      const ActionButtons = () => {
        const [isEditModalOpen, setIsEditModalOpen] = useState(false);
        const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

        const handleEdit = () => {
          setIsEditModalOpen(true);
        };

        const handleDelete = () => {
          setIsDeleteModalOpen(true);
        };

        return (
          <div className="flex gap-2 items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleEdit}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "p-0 w-8 h-8"
                    )}
                  >
                    <FolderPen className="w-4 h-4" />
                    <span className="sr-only">Edit position</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Edit position</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleDelete}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "p-0 w-8 h-8 text-destructive hover:text-destructive"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Delete position</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete position</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      };

      return <ActionButtons />;
    },
    enableSorting: false,
    enableHiding: false,
  },
];

// Export mock data for use in the component
export { mockPositions }; 