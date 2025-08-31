"use client";

import {
    AlertTriangle, Building, CheckCircle, CreditCard, Edit, Eye, FileText, Mail, MoreHorizontal,
    Receipt, RefreshCw, Send, Trash2, User, XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { ColumnDef } from "@tanstack/react-table";
import type { InvoiceTableItem } from "@/features/finance/scehmas/invoice";
import { PermissionGate } from "@/components/PermissionGate";
const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getStatusBadge = (status: string) => {
  const statusConfig = {
    DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-800" },
    ISSUED: { label: "Issued", className: "bg-blue-100 text-blue-800" },

    PAID: { label: "Paid", className: "bg-green-100 text-green-800" },
    OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-800" },
    CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-600" },
    PARTIAL: { label: "Partial", className: "bg-yellow-100 text-yellow-800" },
  };

  const normalized = String(status).toUpperCase();
  const config =
    statusConfig[normalized as keyof typeof statusConfig] || statusConfig.DRAFT;

  return (
    <div className="flex gap-2 items-center">
      <Badge className={config.className}>{config.label}</Badge>
      {normalized === "OVERDUE" && (
        <AlertTriangle className="w-4 h-4 text-red-500" />
      )}
      {normalized === "PAID" && (
        <CheckCircle className="w-4 h-4 text-green-500" />
      )}
    </div>
  );
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "rent":
      return <Building className="w-4 h-4 text-blue-600" />;
    case "utility":
      return <Receipt className="w-4 h-4 text-green-600" />;
    case "service":
      return <FileText className="w-4 h-4 text-purple-600" />;
    case "penalty":
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    case "credit":
      return <CreditCard className="w-4 h-4 text-orange-600" />;
    case "owner":
      return <User className="w-4 h-4 text-indigo-600" />;
    default:
      return <FileText className="w-4 h-4 text-gray-600" />;
  }
};

const getTypeLabel = (type: string) => {
  const typeLabels = {
    rent: "Rent",
    utility: "Utility",
    service: "Service",
    penalty: "Penalty",
    credit: "Credit",
    owner: "Owner",
  };
  return typeLabels[type as keyof typeof typeLabels] || type;
};

const getDaysOverdue = (dueDate: string) => {
  if (!dueDate) return null;
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
};

interface InvoiceColumnsActions {
  onEdit?: (invoice: InvoiceTableItem) => void;
  onSend?: (invoice: InvoiceTableItem, mode?: "send" | "resend") => void;
  onView?: (invoice: InvoiceTableItem) => void;
  onCredit?: (invoice: InvoiceTableItem) => void;
  onDelete?: (invoice: InvoiceTableItem) => void;
  onCancel?: (invoice: InvoiceTableItem) => void;
  onVerifyCollection?: (invoice: InvoiceTableItem) => void; // Added for Verify Collection
}

export const columns = (
  actions: InvoiceColumnsActions = {}
): ColumnDef<InvoiceTableItem>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select row ${row.index + 1}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    accessorKey: "invoiceNumber",
    header: "Invoice #",
    cell: ({ row }) => {
      const invoiceNumber = row.getValue("invoiceNumber") as string;
      const type = row.original.type;
      const recurring = row.original.recurring;

      return (
        <div className="flex gap-2 items-center">
          {getTypeIcon(type)}
          <div>
            <div className="font-medium text-gray-900">{invoiceNumber}</div>
            <div className="flex gap-1 items-center text-xs text-gray-400">
              {getTypeLabel(type)}
              {recurring && (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>{recurring.frequency}</span>
                </>
              )}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "recipient",
    header: "Recipient",
    cell: ({ row }) => {
      const recipient = row.original.recipient;
      const property = row.original.property;

      return (
        <div>
          <div className="font-medium text-gray-900">{recipient.name}</div>
          <div className="text-xs text-gray-400">{recipient.email}</div>
          <div className="text-xs text-gray-400">
            {property.unit} - {property.projectName}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "balance",
    header: "Amount",
    cell: ({ row }) => {
      const balance = row.getValue("balance") as string;
      return (
        <div>
          <div className="font-medium text-gray-900">{balance}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => {
      const dueDate = row.getValue("dueDate") as string;
      const status = row.original.status;
      const daysOverdue = getDaysOverdue(dueDate);

      return (
        <div>
          <div className="font-medium text-gray-900">{formatDate(dueDate)}</div>
          {daysOverdue && status === "overdue" && (
            <div className="text-xs text-red-500">
              {daysOverdue} days overdue
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      return getStatusBadge(row.getValue("status") as string);
    },
  },
  {
    accessorKey: "issueDate",
    header: "Issued",
    cell: ({ row }) => {
      const issueDate = row.getValue("issueDate") as string;
      return <div className="text-gray-600">{formatDate(issueDate)}</div>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const invoice = row.original;
      const isDraft = invoice.status.toLowerCase() === "draft";
      const isSent = invoice.status.toLowerCase() === "sent";
      const isPaid = invoice.status.toLowerCase() === "paid";
      const isOverdue = invoice.status.toLowerCase() === "overdue";
      const isIssued = invoice.status.toLowerCase() === "issued";
      const isPartial = invoice.status.toLowerCase() === "partial";

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 w-8 h-8">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <PermissionGate codename="view_invoices" showFallback={false}>
              <DropdownMenuItem onClick={() => actions.onView?.(invoice)}>
                <Eye className="mr-2 w-4 h-4" />
                View Invoice
              </DropdownMenuItem>
            </PermissionGate>
            {(isDraft || isIssued) && (
              <>
                <PermissionGate codename="edit_invoices" showFallback={false}>
                  <DropdownMenuItem onClick={() => actions.onEdit?.(invoice)}>
                    <Edit className="mr-2 w-4 h-4" />
                    Edit
                  </DropdownMenuItem>
                </PermissionGate>
                <PermissionGate codename="resend_invoices" showFallback={false}>
                  <DropdownMenuItem onClick={() => actions.onSend?.(invoice, "send")}>
                    <Send className="mr-2 w-4 h-4" />
                    Send Invoice
                  </DropdownMenuItem>
                </PermissionGate>
                <PermissionGate codename="delete_invoices" showFallback={false}>
                  <DropdownMenuItem onClick={() => actions.onDelete?.(invoice)}>
                    <Trash2 className="mr-2 w-4 h-4 text-red-600" />
                    Delete Invoice
                  </DropdownMenuItem>
                </PermissionGate>
              </>
            )}
            {isIssued && (
              <PermissionGate codename="cancel_invoices" showFallback={false}>
                <DropdownMenuItem onClick={() => actions.onCancel?.(invoice)}>
                  <XCircle className="mr-2 w-4 h-4 text-yellow-600" />
                  Cancel Invoice
                </DropdownMenuItem>
              </PermissionGate>
            )}
            {(isSent || isOverdue || isIssued) && (
              <PermissionGate codename="resend_invoices" showFallback={false}>
                <DropdownMenuItem onClick={() => actions.onSend?.(invoice, "resend")}>
                  <Mail className="mr-2 w-4 h-4" />
                  Resend
                </DropdownMenuItem>
              </PermissionGate>
            )}
            {!isPaid && (
              <PermissionGate codename="create_credit_note" showFallback={false}>
                <DropdownMenuItem onClick={() => actions.onCredit?.(invoice)}>
                  <CreditCard className="mr-2 w-4 h-4" />
                  Create Credit Note
                </DropdownMenuItem>
              </PermissionGate>
            )}
            {/* Verify Collection Action */}
            {(isIssued || isPartial) && (
              <PermissionGate codename="add_collections" showFallback={false}>
                <DropdownMenuItem onClick={() => actions.onVerifyCollection?.(invoice)}>
                  <CheckCircle className="mr-2 w-4 h-4 text-green-600" />
                  Verify Collection
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
