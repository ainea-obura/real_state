"use client";

import { Shield, Users, CheckSquare, Eye, Trash2, Building2 } from "lucide-react";
import { useState } from "react";

import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
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

import type { Group } from "./schema";

export const GroupsColumns: ColumnDef<Group>[] = [
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
      <DataTableColumnHeader column={column} title="Group Name" />
    ),
    cell: ({ row }) => {
      const group = row.original;
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            {group.is_position_group ? (
              <Building2 className="w-5 h-5 text-blue-600" />
            ) : (
              <Shield className="w-5 h-5 text-purple-600" />
            )}
            <span className="font-semibold text-gray-900">
              {group.is_position_group ? group.position_name : group.name}
            </span>
            <Badge variant={group.is_position_group ? "secondary" : "outline"}>
              {group.is_position_group ? "Position" : "Custom"}
            </Badge>
          </div>
          <div className="text-sm text-gray-500">
            {group.name}
          </div>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "user_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Users" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 items-center">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">
            {row.original.user_count}
          </span>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "permission_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Permissions" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex gap-2 items-center">
          <CheckSquare className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">
            {row.original.permission_count}
          </span>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  // {
  //   accessorKey: "created_at",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="Created Date" />
  //   ),
  //   cell: ({ row }) => {
  //     const date = new Date(row.original.created_at);
  //     return (
  //       <span className="text-gray-900">
  //         {date.toLocaleDateString('en-US', {
  //           year: 'numeric',
  //           month: 'short',
  //           day: 'numeric'
  //         })}
  //       </span>
  //     );
  //   },
  //   enableSorting: true,
  //   enableHiding: true,
  // },
  // {
  //   accessorKey: "modified_at",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="Last Modified" />
  //   ),
  //   cell: ({ row }) => {
  //     const date = new Date(row.original.modified_at);
  //     return (
  //       <span className="text-gray-900">
  //         {date.toLocaleDateString('en-US', {
  //           year: 'numeric',
  //           month: 'short',
  //           day: 'numeric'
  //         })}
  //       </span>
  //     );
  //   },
  //   enableSorting: true,
  //   enableHiding: true,
  // },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const group = row.original;

      const ActionButtons = () => {
        const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
        const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

        const handlePermissions = () => {
          setIsPermissionsModalOpen(true);
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
                    onClick={handlePermissions}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "p-0 w-8 h-8"
                    )}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="sr-only">Manage permissions</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Manage permissions</TooltipContent>
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
                    <span className="sr-only">Delete group</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Delete group</TooltipContent>
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