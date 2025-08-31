import { Delete02Icon } from "hugeicons-react";
import { Building2, Eye, FolderPen, Trash2, User, Users, Shield } from "lucide-react";
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

import type { StaffTableItem } from "../../schema/staff";

// Mock data for demonstration
const mockStaff: StaffTableItem[] = [
  {
    id: "1",
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com",
    phone: "+1234567890",
    position: {
      id: "1",
      name: "Property Manager",
    },
    is_active: true,
    is_deleted: false,
    group_count: 2,
    permission_count: 15,
    created_at: "2024-01-15T10:30:00Z",
    modified_at: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    first_name: "Jane",
    last_name: "Smith",
    email: "jane.smith@example.com",
    phone: "+1234567891",
    position: {
      id: "2",
      name: "Maintenance Technician",
    },
    is_active: true,
    is_deleted: false,
    group_count: 1,
    permission_count: 8,
    created_at: "2024-01-16T14:20:00Z",
    modified_at: "2024-01-16T14:20:00Z",
  },
  {
    id: "3",
    first_name: "Mike",
    last_name: "Johnson",
    email: "mike.johnson@example.com",
    phone: "+1234567892",
    position: null, // Example of staff without position
    is_active: false,
    is_deleted: false,
    group_count: 0,
    permission_count: 0,
    created_at: "2024-01-17T09:15:00Z",
    modified_at: "2024-01-17T09:15:00Z",
  },
];

export const StaffColumns: ColumnDef<StaffTableItem>[] = [
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
      <DataTableColumnHeader column={column} title="Staff Name" />
    ),
    cell: ({ row }) => {
      const staff = row.original;
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <User className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {staff.first_name} {staff.last_name}
            </span>
            <Badge 
              variant={staff.is_active ? "default" : "secondary"}
              className="text-xs"
            >
              {staff.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="text-sm text-gray-500">
            {staff.email}
          </div>
          {staff.phone && (
            <div className="text-sm text-gray-400">
              {staff.phone}
            </div>
          )}
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "position",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Position" />
    ),
    cell: ({ row }) => {
      const position = row.original.position;
      
      // Handle case where position is null or undefined
      if (!position) {
        return (
          <div className="flex gap-2 items-center">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="italic text-gray-400">No position assigned</span>
          </div>
        );
      }
      
      return (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2 items-center">
            <Building2 className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-900">
              {position.name}
            </span>
          </div>
          {position.description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-gray-500 text-sm max-w-[200px] truncate cursor-help">
                    {position.description.length > 25 
                      ? `${position.description.substring(0, 25)}...` 
                      : position.description
                    }
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-sm">{position.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      );
    },
        enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "group_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Groups" />
    ),
    cell: ({ row }) => {
      const groupCount = row.original.group_count;
      return (
        <div className="flex gap-2 items-center">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-900">
            {groupCount}
          </span>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: "permission_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Permissions" />
    ),
    cell: ({ row }) => {
      const permissionCount = row.original.permission_count;
      return (
        <div className="flex gap-2 items-center">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="font-medium text-gray-900">
            {permissionCount}
          </span>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
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
      const staff = row.original;

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
                    <span className="sr-only">Edit staff</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Edit staff</TooltipContent>
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
                    <span className="sr-only">Delete staff</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete staff</TooltipContent>
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

export { mockStaff }; 