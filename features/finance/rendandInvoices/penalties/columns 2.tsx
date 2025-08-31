"use client";

import { format } from "date-fns";
import {
  AlertTriangle,
  DollarSign,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";

import { Penalty } from "./schema/list";
import { PermissionGate } from "@/components/PermissionGate";

interface ColumnsProps {
  onView: (penalty: Penalty) => void;
  onEdit: (penalty: Penalty) => void;
  onWaive: (penalty: Penalty) => void;
  onAddToInvoice: (penalty: Penalty) => void;
  onDelete: (penalty: Penalty) => void;
}

export const createColumns = ({
  onView,
  onEdit,
  onWaive,
  onAddToInvoice,
  onDelete,
}: ColumnsProps): ColumnDef<Penalty>[] => [
  {
    accessorKey: "penalty_number",
    header: "Penalty #",
    cell: ({ row }) => {
      const penalty = row.original;
      return (
        <div className="font-medium text-gray-900">
          {penalty.penalty_number}
        </div>
      );
    },
  },
  {
    accessorKey: "tenant_property",
    header: "Tenant & Property",
    cell: ({ row }) => {
      const penalty = row.original;
      return (
        <div className="space-y-2">
          <div>
            <div className="font-medium text-gray-900">
              {penalty.tenant.name}
            </div>
            <div className="max-w-[200px] text-gray-500 text-sm truncate">
              {penalty.tenant.email}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {penalty.property.unit.split(" -> ").slice(-1)[0]}
              <span className="text-xs text-gray-400">
                ( {penalty.property.project_name})
              </span>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "penalty_type",
    header: "Type",
    cell: ({ row }) => {
      const penalty = row.original;
      const getTypeConfig = (type: string) => {
        switch (type) {
          case "late_payment":
            return {
              label: "Late Payment",
              className: "bg-red-100 text-red-800 border-red-200",
            };
          case "returned_payment":
            return {
              label: "Returned Payment",
              className: "bg-orange-100 text-orange-800 border-orange-200",
            };
          case "lease_violation":
            return {
              label: "Lease Violation",
              className: "bg-purple-100 text-purple-800 border-purple-200",
            };
          case "utility_overcharge":
            return {
              label: "Utility Overcharge",
              className: "bg-blue-100 text-blue-800 border-blue-200",
            };
          default:
            return {
              label: "Other",
              className: "bg-gray-100 text-gray-800 border-gray-200",
            };
        }
      };

      const config = getTypeConfig(penalty.penalty_type);

      return (
        <Badge variant="secondary" className={config.className}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const penalty = row.original;
      return (
        <div className="flex gap-2 items-center">
          <div>
            <div className="font-medium text-gray-900">{penalty.amount}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "dates",
    header: "Dates",
    cell: ({ row }) => {
      const penalty = row.original;
      const appliedDate = penalty.date_applied
        ? new Date(penalty.date_applied)
        : null;
      const dueDate = new Date(penalty.due_date);
      const issuedDate = new Date(penalty.created_at);
      const today = new Date();
      const isOverdue = dueDate < today && penalty.status === "pending";

      return (
        <div className="space-y-1">
          <div className="text-gray-900">
            <div className="font-medium">
              <span className="text-xs text-gray-500">Applied </span>

              {appliedDate ? format(appliedDate, "MMM dd, yyyy") : "-"}
            </div>
          </div>
          <div className="text-gray-900">
            <div className="font-medium">
              <span className="text-xs text-gray-500">Issue </span>

              {format(issuedDate, "MMM dd, yyyy")}
            </div>
          </div>

          <div className={`${isOverdue ? "text-red-600" : "text-gray-900"}`}>
            <div className="font-medium">
              <span className="text-xs text-gray-500">Due </span>

              {format(dueDate, "MMM dd, yyyy")}
            </div>
            {isOverdue && (
              <Badge variant="destructive" className="mt-1 text-xs">
                Overdue
              </Badge>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const penalty = row.original;
      const getStatusConfig = (status: string) => {
        switch (status) {
          case "pending":
            return {
              icon: <AlertTriangle className="w-4 h-4" />,
              label: "Pending",
              variant: "secondary" as const,
              className: "bg-yellow-100 text-yellow-800 border-yellow-200",
            };
          case "applied_to_invoice":
            return {
              icon: <FileText className="w-4 h-4" />,
              label: "Applied to Invoice",
              variant: "secondary" as const,
              className: "bg-blue-100 text-blue-800 border-blue-200",
            };
          case "waived":
            return {
              icon: <X className="w-4 h-4" />,
              label: "Waived",
              variant: "secondary" as const,
              className: "bg-gray-100 text-gray-800 border-gray-200",
            };
          case "paid":
            return {
              icon: <DollarSign className="w-4 h-4" />,
              label: "Paid",
              variant: "secondary" as const,
              className: "bg-green-100 text-green-800 border-green-200",
            };
          default:
            return {
              icon: <AlertTriangle className="w-4 h-4" />,
              label: "Unknown",
              variant: "secondary" as const,
              className: "bg-gray-100 text-gray-800 border-gray-200",
            };
        }
      };

      const config = getStatusConfig(penalty.status);

      return (
        <Badge variant={config.variant} className={config.className}>
          <div className="flex gap-1 items-center">
            {config.icon}
            {config.label}
          </div>
        </Badge>
      );
    },
  },
  {
    accessorKey: "linked_invoice_info",
    header: "Linked Invoice",
    cell: ({ row }) => {
      const penalty = row.original;
      if (!penalty.linked_invoice_info) {
        return <span className="text-gray-400">-</span>;
      }
      return (
        <div className="font-medium text-blue-600">
          {penalty.linked_invoice_info.invoice_number}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const penalty = row.original;

      // Define actions based on penalty status
      const getActionsForStatus = (status: string) => {
        switch (status) {
          case "pending":
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(penalty),
              },
              {
                label: "Edit Penalty",
                icon: <Edit className="mr-2 w-4 h-4" />,
                onClick: () => onEdit(penalty),
              },
              {
                label: "Add to Invoice",
                icon: <FileText className="mr-2 w-4 h-4" />,
                onClick: () => onAddToInvoice(penalty),
              },
              {
                label: "Waive Penalty",
                icon: <X className="mr-2 w-4 h-4" />,
                onClick: () => onWaive(penalty),
              },
              {
                label: "Delete Penalty",
                icon: <Trash2 className="mr-2 w-4 h-4" />,
                onClick: () => onDelete(penalty),
              },
            ];

          case "applied_to_invoice":
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(penalty),
              },
              {
                label: "Edit Penalty",
                icon: <Edit className="mr-2 w-4 h-4" />,
                onClick: () => onEdit(penalty),
              },
              {
                label: "Waive Penalty",
                icon: <X className="mr-2 w-4 h-4" />,
                onClick: () => onWaive(penalty),
              },
            ];

          case "waived":
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(penalty),
              },
              {
                label: "Edit Penalty",
                icon: <Edit className="mr-2 w-4 h-4" />,
                onClick: () => onEdit(penalty),
              },
            ];

          case "paid":
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(penalty),
              },
              {
                label: "Edit Penalty",
                icon: <Edit className="mr-2 w-4 h-4" />,
                onClick: () => onEdit(penalty),
              },
            ];

          default:
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(penalty),
              },
            ];
        }
      };

      const actions = getActionsForStatus(penalty.status).map((action) => {
        switch (action.label) {
          case "Edit Penalty":
            return (
              <PermissionGate
                codename="edit_penalties"
                showFallback={false}
                key={action.label}
              >
                <DropdownMenuItem onClick={action.onClick}>
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              </PermissionGate>
            );
          case "Delete Penalty":
            return (
              <PermissionGate
                codename="delete_penalties"
                showFallback={false}
                key={action.label}
              >
                <DropdownMenuItem onClick={action.onClick}>
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              </PermissionGate>
            );
          case "Waive Penalty":
            return (
              <PermissionGate
                codename="waive_penalties"
                showFallback={false}
                key={action.label}
              >
                <DropdownMenuItem onClick={action.onClick}>
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              </PermissionGate>
            );
          case "Add to Invoice":
            return (
              <PermissionGate
                codename="add_penalties"
                showFallback={false}
                key={action.label}
              >
                <DropdownMenuItem onClick={action.onClick}>
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              </PermissionGate>
            );
          case "View Details":
            return (
              <PermissionGate
                codename="view_penalties"
                showFallback={false}
                key={action.label}
              >
                <DropdownMenuItem onClick={action.onClick}>
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              </PermissionGate>
            );
          default:
            return (
              <DropdownMenuItem onClick={action.onClick} key={action.label}>
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            );
        }
      });

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 w-8 h-8">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map((action, index) => (
              <DropdownMenuItem key={index} onClick={action.onClick}>
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

// Default columns for export
export const columns = createColumns({
  onView: () => {},
  onEdit: () => {},
  onWaive: () => {},
  onAddToInvoice: () => {},
  onDelete: () => {},
});
