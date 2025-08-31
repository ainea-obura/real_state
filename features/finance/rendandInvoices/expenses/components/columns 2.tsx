import { ColumnDef } from "@tanstack/react-table";
import { Expense } from "../schema/expenseSchema";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, CheckCircle, Edit2, XCircle } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";

interface CreateColumnsProps {
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onApprove: (expense: Expense) => void;
  onReject: (expense: Expense) => void;
  onPay: (expense: Expense) => void;
}

export const createExpenseColumns = ({
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onPay,
}: CreateColumnsProps): ColumnDef<Expense, any>[] => [
  {
    accessorKey: "expense_number",
    header: "#",
    cell: ({ row }) => row.original.expense_number,
  },
  {
    accessorKey: "location_node",
    header: "Property",
    cell: ({ row }) => {
      const property = row.original.location_node;
      return (
        <div>
          <div className="font-medium text-gray-900">
            {property?.name || "-"}
          </div>
          {property?.project_name && (
            <div className="text-xs text-gray-500">{property.project_name}</div>
          )}
        </div>
      );
    },
  },
  {
    id: "category_vendor",
    header: "Category & Vendor",
    cell: ({ row }) => {
      const { service, vendor } = row.original;
      
      const billedTo = service?.billed_to
        ? service.billed_to.charAt(0).toUpperCase() + service.billed_to.slice(1)
        : null;
      
      return (
        <div className="space-y-2">
          {/* Category Section */}
          <div className="pb-2 border-b border-gray-200">
            <div className="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
              Category
            </div>
            <div className="font-medium text-blue-700">
              {service?.name || "-"}
            </div>
            {billedTo && (
              <div className="text-xs text-gray-500">Billed to: {billedTo}</div>
            )}
          </div>
          
          {/* Vendor Section */}
          <div>
            <div className="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
              Vendor
            </div>
            <div className="font-medium text-gray-800">
              {vendor?.name || "-"}
            </div>
            {vendor?.email && (
              <div className="text-xs text-gray-500">{vendor.email}</div>
            )}
            {vendor?.phone && (
              <div className="text-xs text-gray-400">{vendor.phone}</div>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "commission",
    header: "Commission",
    cell: ({ row }) => {
      const { commission_type } = row.original;
      
      if (!commission_type) {
        return <span className="text-gray-400">-</span>;
      }
      
      return (
        <div className="font-medium text-green-700">
          {commission_type}
        </div>
      );
    },
  },
  {
    id: "amounts",
    header: "Amounts",
    cell: ({ row }) => {
      const { amount, tax_amount, total_amount, currency } = row.original;
      return (
        <div className="space-y-0.5">
          <div className="font-medium text-gray-900">
            {total_amount?.toLocaleString() || 0}{" "}
            <span className="text-xs text-gray-500">Total</span>
          </div>
          <div className="text-xs text-gray-500">
            Base: {amount?.toLocaleString() || 0} • Tax: {tax_amount?.toLocaleString() || 0}
          </div>
        </div>
      );
    },
  },
  {
    id: "dates",
    header: "Dates",
    cell: ({ row }) => {
      const { invoice_date, due_date, paid_date } = row.original;
      return (
        <div className="space-y-0.5 text-xs">
          <div>
            <span className="font-medium text-gray-700">Invoice:</span>{" "}
            {invoice_date}
          </div>
          <div>
            <span className="font-medium text-gray-700">Due:</span> {due_date}
          </div>
          <div>
            <span className="font-medium text-gray-700">Paid:</span>{" "}
            {paid_date || "-"}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      let status = row.original.status;
      const statusMap: Record<string, string> = {
        paid: "bg-green-100 text-green-800",
        pending: "bg-yellow-100 text-yellow-800",
        overdue: "bg-red-100 text-red-800",
        waiting_for_approval: "bg-orange-100 text-orange-700",
      };
      const badgeClass = statusMap[status] || "bg-gray-100 text-gray-800";

      if (status === "waiting_for_approval") {
        status = "Pending Approval"
      }
      
      return (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${badgeClass}`}
        >
          {status}
        </span>
      );
    },
  },
  {
    id: "desc_notes",
    header: "Description",
    cell: ({ row }) => {
      const { description, notes } = row.original;
      
      const truncateText = (text: string, maxLength: number = 50) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
      };
      
      const fullDescription = description || "";
      const fullNotes = notes || "";
      const combinedText = fullDescription + (fullNotes ? `\n${fullNotes}` : "");
      
      return (
        <div className="text-xs text-gray-700">
          <div 
            className="truncate max-w-[200px]"
            title={fullDescription}
          >
            {fullDescription || "-"}
          </div>
          {fullNotes && (
            <div 
              className="text-xs text-gray-400"
              title={fullNotes}
            >
              {fullNotes}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "document",
    header: "Document",
    cell: ({ row }) => {
      const url = row.original.document_url;
      if (!url) return <span className="text-xs text-gray-400">-</span>;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-1 items-center text-blue-600 hover:underline"
        >
          <FileText className="w-4 h-4" />
          <span className="text-xs">View</span>
        </a>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const expense = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded hover:bg-gray-100">
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <PermissionGate codename="approve_expenses" showFallback={false}>
              <DropdownMenuItem
                onClick={() => onApprove(expense)}
                disabled={expense.status !== "waiting_for_approval"}
                className={
                  expense.status !== "waiting_for_approval"
                    ? "text-gray-400"
                    : "text-orange-600 focus:text-orange-700"
                }
              >
                <CheckCircle className="mr-2 w-4 h-4" /> Approve
              </DropdownMenuItem>
            </PermissionGate>
            <PermissionGate codename="approve_expenses" showFallback={false}>
              <DropdownMenuItem
                onClick={() => onReject(expense)}
                disabled={expense.status !== "waiting_for_approval"}
                className={
                  expense.status !== "waiting_for_approval"
                    ? "text-gray-400"
                    : "text-red-600 focus:text-red-700"
                }
              >
                <XCircle className="mr-2 w-4 h-4" /> Reject
              </DropdownMenuItem>
            </PermissionGate>
            <PermissionGate codename="pay_expenses" showFallback={false}>
              <DropdownMenuItem
                onClick={() => onPay(expense)}
                disabled={expense.status === "paid" || expense.status === "waiting_for_approval" || expense.status === "rejected"}
                className={
                  expense.status === "paid" || expense.status === "waiting_for_approval" || expense.status === "rejected"
                    ? "text-gray-400"
                    : "text-green-600 focus:text-green-700"
                }
              >
                <CheckCircle className="mr-2 w-4 h-4" /> Pay
              </DropdownMenuItem>
            </PermissionGate>
            <PermissionGate codename="delete_expenses" showFallback={false}>
              <DropdownMenuItem
                onClick={() => onDelete(expense)}
                disabled={expense.status !== "pending"}
                className={
                  expense.status !== "pending"
                    ? "text-gray-400"
                    : "text-red-600 focus:text-red-700"
                }
              >
                <Trash2 className="mr-2 w-4 h-4" /> Delete
              </DropdownMenuItem>
            </PermissionGate>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
