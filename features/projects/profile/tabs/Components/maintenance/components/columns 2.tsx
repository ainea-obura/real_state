import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Edit,
  ChevronRight,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";

// Status badge color map
const statusColor: Record<
  "open" | "in_progress" | "resolved" | "closed",
  string
> = {
  open: "bg-gray-200 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-red-100 text-red-800",
};
const priorityColor: Record<"urgent" | "high" | "medium" | "low", string> = {
  urgent: "bg-red-200 text-red-800",
  high: "bg-orange-200 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-600",
};

export function maintenanceColumns({
  onStatusChange,
  onDelete,
  onEdit,
}: {
  onStatusChange: (
    row: any,
    type: "in_progress" | "resolved" | "closed"
  ) => void;
  onDelete: (row: any) => void;
  onEdit: (row: any) => void;
}) {
  return [
    {
      accessorKey: "title",
      header: "Request",
      cell: ({ row }: any) => (
        <div>
          <div className="font-semibold">{row.original.title}</div>
          <div className="text-xs text-gray-500">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "project",
      header: "Project",
      cell: ({ row }: any) => (
        <div className="font-medium text-gray-900">
          <div>{row.original.node}</div>
          <div className="text-xs text-gray-500">{row.original.project}</div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge
          className={
            statusColor[row.original.status as keyof typeof statusColor] || ""
          }
        >
          {row.original.status
            .replace("_", " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase())}
        </Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }: any) => (
        <Badge
          className={
            priorityColor[
              row.original.priority as keyof typeof priorityColor
            ] || ""
          }
        >
          {row.original.priority.charAt(0).toUpperCase() +
            row.original.priority.slice(1)}
        </Badge>
      ),
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }: any) => (
        <div className="flex flex-col gap-y-1 text-sm">
          <span className="font-medium text-gray-900">
            {row.original.vendor.name}
          </span>
          <span className="text-gray-700">{row.original.vendor.email}</span>
          <span className="text-gray-700">{row.original.vendor.phone}</span>
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }: any) => (
        <span>{row.original.created_at || "-"}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.status === "open" && (
              <PermissionGate codename="edit_maintenance" showFallback={false}>
                <DropdownMenuItem
                  onClick={() => onStatusChange(row.original, "in_progress")}
                  className="text-blue-700"
                >
                  <ChevronRight className="mr-2 w-4 h-4" /> Set In Progress
                </DropdownMenuItem>
              </PermissionGate>
            )}
            {row.original.status === "in_progress" && (
              <PermissionGate codename="edit_maintenance" showFallback={false}>
                <DropdownMenuItem
                  onClick={() => onStatusChange(row.original, "resolved")}
                  className="text-green-700"
                >
                  <Check className="mr-2 w-4 h-4" /> Set Resolved
                </DropdownMenuItem>
              </PermissionGate>
            )}
            {row.original.status === "resolved" && (
              <PermissionGate codename="edit_maintenance" showFallback={false}>
                <DropdownMenuItem
                  onClick={() => onStatusChange(row.original, "closed")}
                  className="text-red-700"
                >
                  <X className="mr-2 w-4 h-4" /> Set Closed
                </DropdownMenuItem>
              </PermissionGate>
            )}
            {row.original.status === "open" && (
              <PermissionGate codename="delete_maintenance" showFallback={false}>
                <DropdownMenuItem
                  onClick={() => onDelete(row.original)}
                  className="text-red-700"
                >
                  <Trash2 className="mr-2 w-4 h-4" /> Delete
                </DropdownMenuItem>
              </PermissionGate>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
