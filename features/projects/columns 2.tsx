import { Delete02Icon } from "hugeicons-react";
import { useSetAtom } from "jotai";
import { Building2, Eye, FolderPen, Home, MapPin, Users2 } from "lucide-react";
import Link from "next/link";

import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions";
import { PermissionGate } from "@/components/PermissionGate";
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
import {
  deleteProjectId,
  isDeleteProjectModalOpen,
  isProjectModelOpen,
  selectedProjectAtom,
} from "@/store";
import { ColumnDef } from "@tanstack/react-table";

import type {
  Project,
  ProjectStatus,
  ProjectType,
} from "@/schema/projects/schema";

// Helper function to get status badge style
const getStatusStyle = (status: ProjectStatus) => {
  const styles: Record<
    ProjectStatus,
    { bg: string; icon: string; text: string; progress: number }
  > = {
    planned: {
      bg: "bg-blue-50 border border-blue-200/50",
      icon: "bg-blue-500",
      text: "text-blue-700",
      progress: 0,
    },
    ongoing: {
      bg: "bg-yellow-50 border border-yellow-200/50",
      icon: "bg-yellow-500",
      text: "text-yellow-700",
      progress: 50,
    },
    completed: {
      bg: "bg-green-50 border border-green-200/50",
      icon: "bg-green-500",
      text: "text-green-700",
      progress: 100,
    },
    "on-hold": {
      bg: "bg-red-50 border border-red-200/50",
      icon: "bg-red-500",
      text: "text-red-700",
      progress: 25,
    },
  };
  return styles[status];
};

// Helper function to get project type badge style
const getProjectTypeStyle = (type: ProjectType) => {
  const styles: Record<
    ProjectType,
    { bg: string; text: string; icon: React.ElementType }
  > = {
    residential: {
      bg: "bg-indigo-100 border border-indigo-200/50",
      text: "text-indigo-700",
      icon: Home,
    },
    commercial: {
      bg: "bg-emerald-100 border border-emerald-200/50",
      text: "text-emerald-700",
      icon: Building2,
    },
    "mixed-use": {
      bg: "bg-purple-100 border border-purple-200/50",
      text: "text-purple-700",
      icon: Users2,
    },
  };
  return styles[type];
};

export const ProjectsColumns: ColumnDef<Project>[] = [
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
    accessorKey: "node.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Project Name" />
    ),
    cell: ({ row }) => {
      const type = row.original?.project_type as ProjectType;
      const style = type ? getProjectTypeStyle(type) : { icon: Building2 };
      const TypeIcon = style.icon;
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {row.original.node.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <MapPin className="w-4 h-4" />
            <span className="max-w-[200px] truncate">
              {row.original.location.address}
            </span>
          </div>
        </div>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original?.status as ProjectStatus;
      const style = status ? getStatusStyle(status) : getStatusStyle("planned");
      return (
        <div className="flex flex-col gap-2">
          <Badge
            className={cn(
              "font-medium capitalize px-2 py-1 w-fit",
              style.bg,
              style.text
            )}
          >
            <span
              className={cn(
                "mr-1.5 h-1.5 w-1.5 rounded-full inline-block",
                style.icon
              )}
            />
            {status}
          </Badge>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "project_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = row.original?.project_type as ProjectType;
      if (!type) {
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 border border-gray-200/50 font-medium text-gray-700 capitalize">
              <Building2 className="w-3.5 h-3.5" />
              Unknown
            </Badge>
          </div>
        );
      }
      const style = getProjectTypeStyle(type);
      const TypeIcon = style.icon;
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              "font-medium capitalize px-2 py-1 flex items-center gap-1.5",
              style.bg,
              style.text
            )}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            {type}
          </Badge>{" "}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created Date" />
    ),
    cell: ({ row }) => {
      return <span className="text-gray-900">{row.original.created_at}</span>;
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "blocks",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Blocks" />
    ),
    cell: ({ row }) => {
      return (
        <Link
          href={`/projects/${row.original.id}?tab=structure&modal=block`}
          className="flex items-center gap-2 hover:underline cursor-pointer"
        >
          <Building2 className="w-4 h-4 text-primary/70" />
          <span className="font-medium text-gray-700">
            {row.original.structure_count?.total_blocks ?? 0}
          </span>
        </Link>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "houses",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Houses" />
    ),
    cell: ({ row }) => {
      return (
        <Link
          href={`/projects/${row.original.id}?tab=structure&modal=house`}
          className="flex items-center gap-2 hover:underline cursor-pointer"
        >
          <Home className="w-4 h-4 text-primary/70" />
          <span className="font-medium text-gray-700">
            {row.original.structure_count?.total_houses ?? 0}
          </span>
        </Link>
      );
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "management_fee",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Management Fee" />
    ),
    cell: ({ row }) => {
      const managementFee = row.original.management_fee;
      if (!managementFee) {
        return (
          <Badge className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 border border-gray-200/50 font-medium text-gray-700 capitalize">
            {/* <DollarSign className="w-3.5 h-3.5" /> */}
            N/A
          </Badge>
        );
      }
      return (
        <Badge className="flex items-center gap-1.5 bg-green-100 px-2 py-1 border border-green-200/50 font-medium text-green-700 capitalize">
          {/* <DollarSign className="w-3.5 h-3.5" /> */}
          {managementFee}
        </Badge>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const ActionButtons = () => {
        const setIsOpen = useSetAtom(isProjectModelOpen);
        const setSelectedProject = useSetAtom(selectedProjectAtom);
        const setDeleteModalOpen = useSetAtom(isDeleteProjectModalOpen);
        const setDeleteProjectId = useSetAtom(deleteProjectId);
        const handleEdit = () => {
          setSelectedProject({ data: row.original, error: false });
          setIsOpen(true);
        };
        const handleDelete = () => {
          setDeleteProjectId(row.original.id);
          setDeleteModalOpen(true);
        };
        return (
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <PermissionGate
                codename="view_projects_profile"
                showFallback={false}
              >
                <Tooltip>
                  <Link href={`/projects/${row.original.id}`}>
                    <TooltipTrigger className="group flex justify-center items-center bg-primary/10 hover:bg-primary rounded-md w-8 h-8 hover:text-white transition-all duration-300 cursor-pointer">
                      <Eye className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                      <span className="sr-only">View Project Details</span>
                    </TooltipTrigger>
                  </Link>
                  <TooltipContent side="left">
                    <p>View Project Details</p>
                  </TooltipContent>
                </Tooltip>
              </PermissionGate>

              <PermissionGate codename="edit_projects" showFallback={false}>
                <Tooltip>
                  <TooltipTrigger
                    onClick={handleEdit}
                    className="group flex justify-center items-center bg-primary/10 hover:bg-primary rounded-md w-8 h-8 hover:text-white transition-all duration-300 cursor-pointer"
                  >
                    <FolderPen className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                    <span className="sr-only">Edit Project</span>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Edit Project</p>
                  </TooltipContent>
                </Tooltip>
              </PermissionGate>

              <PermissionGate codename="delete_projects" showFallback={false}>
                <Tooltip>
                  <div className={cn(buttonVariants, "w-fit h-fit")}>
                    <TooltipTrigger
                      onClick={handleDelete}
                      className="group flex justify-center items-center bg-primary/10 hover:bg-red-500 rounded-md w-8 h-8 hover:text-white transition-all duration-300 cursor-pointer"
                    >
                      <Delete02Icon className="w-[18px] h-[18px] text-primary group-hover:text-white transition-all duration-300" />
                      <span className="sr-only">Delete Project</span>
                    </TooltipTrigger>
                  </div>
                  <TooltipContent side="left">
                    <p>Delete Project</p>
                  </TooltipContent>
                </Tooltip>
              </PermissionGate>
            </div>
          </TooltipProvider>
        );
      };
      return (
        <DataTableRowActions
          row={row}
          renderActions={() => <ActionButtons />}
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
