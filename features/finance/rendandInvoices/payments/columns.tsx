"use client";

import { format } from 'date-fns';
import {
    Banknote, CheckCircle, Clock, CreditCard, DollarSign, Eye, Mail, MoreHorizontal, Receipt,
    RefreshCw, RotateCcw, Smartphone, X, XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';
import { PermissionGate } from "@/components/PermissionGate";

// Types
interface Payment {
  id: string;
  paymentNumber: string;
  tenant: {
    name: string;
    email: string;
    phone: string;
  };
  property: {
    unit: string;
    projectName: string;
  };
  paymentDate: string;
  paymentMethod: string; // Made more flexible
  amountPaid: string | number;
  invoicesApplied: {
    id: string;
    invoiceNumber: string;
    amount: string | number;
  }[];
  balanceRemaining: string | number;
  status: "success" | "failed" | "refunded" | "partial" | "pending";
  notes?: string;
  receiptUrl?: string | null; // Allow null
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

interface ColumnsProps {
  onView: (payment: Payment) => void;
  onEdit: (payment: Payment) => void;
  onRetry: (payment: Payment) => void;
  onRefund: (payment: Payment) => void;
  onCancel: (payment: Payment) => void;
  onDownloadReceipt: (payment: Payment) => void;
  onSendReceipt: (payment: Payment) => void;
  onViewPersonPayments: (groupedPayment: GroupedPayment) => void;
  defaultCurrency?: { code: string; symbol: string };
}

interface GroupedPayment {
  personId: string;
  personName: string;
  personEmail: string;
  personPhone: string;
  personType: "tenant" | "owner";
  totalPayments: number;
  totalAmount: number;
  lastPaymentDate: string;
  payments: Payment[];
}

export const createColumns = ({
  onView,
  onEdit,
  onRetry,
  onRefund,
  onCancel,
  onDownloadReceipt,
  onSendReceipt,
  defaultCurrency = { code: "KES", symbol: "KES" },
}: ColumnsProps): ColumnDef<Payment>[] => [
  {
    accessorKey: "paymentNumber",
    header: "Payment #",
    cell: ({ row }) => {
      const payment = row.original;
      return (
        <div className="font-medium text-gray-900">{payment.paymentNumber}</div>
      );
    },
  },
  {
    accessorKey: "tenant.name",
    header: "Tenant / Owner",
    cell: ({ row }) => {
      const payment = row.original;
      return (
        <div>
          <div className="font-medium text-gray-900">{payment.tenant.name}</div>
          <div className="text-sm text-gray-500">{payment.tenant.email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "property",
    header: "Property",
    cell: ({ row }) => {
      const payment = row.original;
      return (
        <div>
          <div className="font-medium text-gray-900">
            {payment.property.unit}
          </div>
          <div className="text-sm text-gray-500">
            {payment.property.projectName}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "paymentDate",
    header: "Payment Date",
    cell: ({ row }) => {
      const payment = row.original;
      return (
        <div className="text-gray-900">
          {format(new Date(payment.paymentDate), "MMM dd, yyyy")}
        </div>
      );
    },
  },
  {
    accessorKey: "paymentMethod",
    header: "Method",
    cell: ({ row }) => {
      const payment = row.original;
      const getMethodIcon = (method: string) => {
        switch (method) {
          case "cash":
            return <Banknote className="w-4 h-4" />;
          case "bank_transfer":
            return <DollarSign className="w-4 h-4" />;
          case "online":
            return <CreditCard className="w-4 h-4" />;
          case "evc_plus":
          case "mpesa":
            return <Smartphone className="w-4 h-4" />;
          default:
            return <DollarSign className="w-4 h-4" />;
        }
      };

      const getMethodLabel = (method: string) => {
        switch (method) {
          case "cash":
            return "Cash";
          case "bank_transfer":
            return "Bank Transfer";
          case "online":
            return "Online";
          case "evc_plus":
            return "EVC+";
          case "mpesa":
            return "M-Pesa";
          default:
            return "Other";
        }
      };

      return (
        <div className="flex gap-2 items-center">
          {getMethodIcon(payment.paymentMethod)}
          <span className="text-gray-900">
            {getMethodLabel(payment.paymentMethod)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "amountPaid",
    header: "Amount Paid",
    cell: ({ row }) => {
      const payment = row.original;
      return (
        <div className="font-medium text-gray-900">
          {typeof payment.amountPaid === 'string' 
            ? payment.amountPaid 
            : `${defaultCurrency.symbol} ${payment.amountPaid.toFixed(2)}`
          }
        </div>
      );
    },
  },
  {
    accessorKey: "invoicesApplied",
    header: "Invoices Applied",
    cell: ({ row }) => {
      const payment = row.original;
      return (
        <div>
          {payment.invoicesApplied.length > 0 ? (
            <div className="space-y-1">
              {payment.invoicesApplied.slice(0, 2).map((invoice) => (
                <div key={invoice.id} className="text-sm">
                  <span className="text-gray-900">{invoice.invoiceNumber}</span>
                  <span className="ml-1 text-gray-500">({invoice.amount})</span>
                </div>
              ))}
              {payment.invoicesApplied.length > 2 && (
                <div className="text-sm text-gray-500">
                  +{payment.invoicesApplied.length - 2} more
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-500">No invoices</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "balanceRemaining",
    header: "Balance",
    cell: ({ row }) => {
      const payment = row.original;
      const balanceValue = typeof payment.balanceRemaining === 'string' 
        ? parseFloat(payment.balanceRemaining.replace(/[^0-9.-]+/g, '')) 
        : payment.balanceRemaining;
      
      return (
        <div
          className={`font-medium ${
            balanceValue > 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          {typeof payment.balanceRemaining === 'string' 
            ? payment.balanceRemaining 
            : `${defaultCurrency.symbol} ${payment.balanceRemaining.toFixed(2)}`
          }
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const payment = row.original;
      const getStatusConfig = (status: string) => {
        switch (status) {
          case "success":
            return {
              icon: <CheckCircle className="w-4 h-4" />,
              label: "Success",
              variant: "default" as const,
              className: "bg-green-100 text-green-800 border-green-200",
            };
          case "failed":
            return {
              icon: <XCircle className="w-4 h-4" />,
              label: "Failed",
              variant: "destructive" as const,
              className: "bg-red-100 text-red-800 border-red-200",
            };
          case "refunded":
            return {
              icon: <RotateCcw className="w-4 h-4" />,
              label: "Refunded",
              variant: "secondary" as const,
              className: "bg-orange-100 text-orange-800 border-orange-200",
            };
          case "partial":
            return {
              icon: <Clock className="w-4 h-4" />,
              label: "Partial",
              variant: "secondary" as const,
              className: "bg-yellow-100 text-yellow-800 border-yellow-200",
            };
          case "pending":
            return {
              icon: <Clock className="w-4 h-4" />,
              label: "Pending",
              variant: "secondary" as const,
              className: "bg-blue-100 text-blue-800 border-blue-200",
            };
          default:
            return {
              icon: <Clock className="w-4 h-4" />,
              label: "Unknown",
              variant: "secondary" as const,
              className: "bg-gray-100 text-gray-800 border-gray-200",
            };
        }
      };

      const config = getStatusConfig(payment.status);

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
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const payment = row.original;

      // Define actions based on payment status
      const getActionsForStatus = (status: string) => {
        // Check if payment is already refunded (negative amount)
        const isRefunded = typeof payment.amountPaid === 'number' 
          ? payment.amountPaid < 0 
          : parseFloat(payment.amountPaid.toString().replace(/[^0-9.-]+/g, '')) < 0;

        switch (status) {
          case "success":
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(payment),
              },
              {
                label: "Download Receipt",
                icon: <Receipt className="mr-2 w-4 h-4" />,
                onClick: () => onDownloadReceipt(payment),
                show: !!payment.receiptUrl,
              },
              {
                label: "Send Receipt",
                icon: <Mail className="mr-2 w-4 h-4" />,
                onClick: () => onSendReceipt(payment),
                show: !!payment.receiptUrl,
              },
              {
                label: "Refund Payment",
                icon: <RotateCcw className="mr-2 w-4 h-4" />,
                onClick: () => onRefund(payment),
                show: !isRefunded, // Hide if already refunded
              },
            ];

          case "failed":
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(payment),
              },
              {
                label: "Retry Payment",
                icon: <RefreshCw className="mr-2 w-4 h-4" />,
                onClick: () => onRetry(payment),
              },
              {
                label: "Edit Payment",
                icon: <DollarSign className="mr-2 w-4 h-4" />,
                onClick: () => onEdit(payment),
              },
            ];

          case "pending":
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(payment),
              },
              {
                label: "Cancel Payment",
                icon: <X className="mr-2 w-4 h-4" />,
                onClick: () => onCancel(payment),
              },
              {
                label: "Edit Payment",
                icon: <DollarSign className="mr-2 w-4 h-4" />,
                onClick: () => onEdit(payment),
              },
            ];

          case "partial":
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(payment),
              },
              {
                label: "Download Receipt",
                icon: <Receipt className="mr-2 w-4 h-4" />,
                onClick: () => onDownloadReceipt(payment),
                show: !!payment.receiptUrl,
              },
              {
                label: "Send Receipt",
                icon: <Mail className="mr-2 w-4 h-4" />,
                onClick: () => onSendReceipt(payment),
                show: !!payment.receiptUrl,
              },
              {
                label: "Edit Payment",
                icon: <DollarSign className="mr-2 w-4 h-4" />,
                onClick: () => onEdit(payment),
              },
              {
                label: "Refund Payment",
                icon: <RotateCcw className="mr-2 w-4 h-4" />,
                onClick: () => onRefund(payment),
                show: !isRefunded, // Hide if already refunded
              },
            ];

          case "refunded":
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(payment),
              },
              {
                label: "Download Receipt",
                icon: <Receipt className="mr-2 w-4 h-4" />,
                onClick: () => onDownloadReceipt(payment),
                show: !!payment.receiptUrl,
              },
            ];

          default:
            return [
              {
                label: "View Details",
                icon: <Eye className="mr-2 w-4 h-4" />,
                onClick: () => onView(payment),
              },
            ];
        }
      };

      const actions = getActionsForStatus(payment.status);

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 w-8 h-8">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions
              .filter((action) => action.show !== false)
              .map((action, index) => {
                switch (action.label) {
                  case "View Details":
                    return (
                      <PermissionGate codename="view_collections" showFallback={false} key={action.label}>
                        <DropdownMenuItem onClick={action.onClick}>
                          {action.icon}
                          {action.label}
                        </DropdownMenuItem>
                      </PermissionGate>
                    );
                  case "Edit Collection":
                    return (
                      <PermissionGate codename="edit_disbursment" showFallback={false} key={action.label}>
                        <DropdownMenuItem onClick={action.onClick}>
                          {action.icon}
                          {action.label}
                        </DropdownMenuItem>
                      </PermissionGate>
                    );
                  case "Cancel Collection":
                    return (
                      <PermissionGate codename="cancel_disbursment" showFallback={false} key={action.label}>
                        <DropdownMenuItem onClick={action.onClick}>
                          {action.icon}
                          {action.label}
                        </DropdownMenuItem>
                      </PermissionGate>
                    );
                  case "Refund Collection":
                    return (
                      <PermissionGate codename="refund_disbursment" showFallback={false} key={action.label}>
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
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const createGroupedColumns = ({
  onView,
  onEdit,
  onRetry,
  onRefund,
  onCancel,
  onDownloadReceipt,
  onSendReceipt,
  onViewPersonPayments,
  defaultCurrency = { code: "KES", symbol: "KES" },
}: ColumnsProps): ColumnDef<GroupedPayment>[] => [
  {
    accessorKey: "personName",
    header: "Person",
    cell: ({ row }) => {
      const groupedPayment = row.original;
      return (
        <div>
          <div className="font-medium text-gray-900">{groupedPayment.personName}</div>
          <div className="text-sm text-gray-500">{groupedPayment.personEmail}</div>
          <div className="text-xs text-gray-400">{groupedPayment.personPhone}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "totalPayments",
    header: "Total Payments",
    cell: ({ row }) => {
      const groupedPayment = row.original;
      return (
        <div className="font-medium text-gray-900">
          {groupedPayment.totalPayments}
        </div>
      );
    },
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
    cell: ({ row }) => {
      const groupedPayment = row.original;
      return (
        <div className="font-medium text-gray-900">
          {defaultCurrency.symbol} {groupedPayment.totalAmount.toFixed(2)}
        </div>
      );
    },
  },
  {
    accessorKey: "lastPaymentDate",
    header: "Last Payment",
    cell: ({ row }) => {
      const groupedPayment = row.original;
      return (
        <div className="text-gray-900">
          {groupedPayment.lastPaymentDate 
            ? format(new Date(groupedPayment.lastPaymentDate), "MMM dd, yyyy")
            : "-"
          }
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const groupedPayment = row.original;
      return (
        <div className="flex gap-2 items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewPersonPayments(groupedPayment)}
            className="p-0 w-8 h-8"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      );
    },
  },
];

// Default columns for export
export const columns = createColumns({
  onView: () => {},
  onEdit: () => {},
  onRetry: () => {},
  onRefund: () => {},
  onCancel: () => {},
  onDownloadReceipt: () => {},
  onSendReceipt: () => {},
  onViewPersonPayments: () => {},
});
