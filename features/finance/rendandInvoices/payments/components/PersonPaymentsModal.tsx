"use client";

import { format } from "date-fns";
import {
  Calendar,
  DollarSign,
  Mail,
  MapPin,
  Phone,
  Receipt,
  User,
  MoreHorizontal,
  Download,
  Send,
  Eye,
  RotateCcw,
  Edit,
  Trash2,
  Filter,
  Search,
  Clock,
} from "lucide-react";
import { useState, useMemo } from "react";

import { getCurrencyDropdown } from '@/actions/projects/index';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/PermissionGate";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/datatable/data-table";
import { ColumnDef } from "@tanstack/react-table";
import FeatureCard from "@/features/property/tabs/components/featureCard";
import { useQuery } from "@tanstack/react-query";
import CreditNoteModal from "./CreditNoteModal";

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
  paymentMethod: string;
  amountPaid: string | number;
  amountPaidNoCurrency: number;
  invoicesApplied: {
    id: string;
    invoiceNumber: string;
    amount: string | number;
  }[];
  balanceRemaining: string | number;
  status: "success" | "failed" | "refunded" | "partial" | "pending";
  notes?: string;
  receiptUrl?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
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

interface PersonPaymentsModalProps {
  open: boolean;
  onClose: () => void;
  groupedPayment: GroupedPayment;
}

const PersonPaymentsModal = ({
  open,
  onClose,
  groupedPayment,
}: PersonPaymentsModalProps) => {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState("all");
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<Payment | null>(null);

  // Fetch currency data
  const { data: currencies } = useQuery({
    queryKey: ["currency-dropdown"],
    queryFn: async () => {
      const response = await getCurrencyDropdown();
      return response;
    },
  });

  // Get default currency
  const defaultCurrency = currencies?.[0] || { code: "KES", symbol: "KES" };

  // Get unique invoices for filtering
  const uniqueInvoices = useMemo(() => {
    const allInvoices = groupedPayment.payments.flatMap((payment) =>
      payment.invoicesApplied.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
      }))
    );

    return allInvoices.filter(
      (invoice, index, self) =>
        index === self.findIndex((i) => i.id === invoice.id)
    );
  }, [groupedPayment.payments]);

  // Filter payments based on invoice filter
  const filteredPayments = useMemo(() => {
    return groupedPayment.payments.filter((payment) => {
      // Invoice filter
      if (selectedInvoice !== "all") {
        const hasInvoice = payment.invoicesApplied.some(
          (invoice) => invoice.id === selectedInvoice
        );
        if (!hasInvoice) return false;
      }

      return true;
    });
  }, [groupedPayment.payments, selectedInvoice]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "success":
        return {
          label: "Success",
          className: "bg-green-100 text-green-800 border-green-200",
        };
      case "failed":
        return {
          label: "Failed",
          className: "bg-red-100 text-red-800 border-red-200",
        };
      case "refunded":
        return {
          label: "Refunded",
          className: "bg-orange-100 text-orange-800 border-orange-200",
        };
      case "partial":
        return {
          label: "Partial",
          className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        };
      case "pending":
        return {
          label: "Pending",
          className: "bg-blue-100 text-blue-800 border-blue-200",
        };
      default:
        return {
          label: "Unknown",
          className: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <DollarSign className="w-4 h-4" />;
      case "bank_transfer":
        return <Receipt className="w-4 h-4" />;
      case "online":
        return <Receipt className="w-4 h-4" />;
      case "evc_plus":
      case "mpesa":
        return <Phone className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    // You can implement view payment logic here
  };

  const handleDownloadReceipt = (payment: Payment) => {
    if (payment.receiptUrl) {
      window.open(payment.receiptUrl, "_blank");
    }
  };

  const handleSendReceipt = (payment: Payment) => {
    // Implement send receipt logic
    console.log("Send receipt for payment:", payment.id);
  };

  const handleRefundPayment = (payment: Payment) => {
    setSelectedPaymentForRefund(payment);
    setIsCreditNoteModalOpen(true);
  };

  // Table columns
  const columns: ColumnDef<Payment>[] = [
    {
      accessorKey: "paymentNumber",
      header: "Payment #",
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="flex gap-2 items-center">
            {getMethodIcon(payment.paymentMethod)}
            <span className="font-medium text-gray-900">
              {payment.paymentNumber}
            </span>
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
      header: "Date",
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
      accessorKey: "amountPaid",
      header: "Amount",
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="font-medium text-gray-900">
            {defaultCurrency.symbol} {typeof payment.amountPaid === "string"
              ? parseFloat(
                  payment.amountPaid.replace(/[^0-9.-]+/g, "")
                ).toFixed(2)
              : payment.amountPaid.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const payment = row.original;
        const statusConfig = getStatusConfig(payment.status);
        return (
          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
        );
      },
    },
    {
      accessorKey: "invoicesApplied",
      header: "Invoices",
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="flex flex-wrap gap-1">
            {payment.invoicesApplied.map((invoice) => (
              <Badge key={invoice.id} variant="outline" className="text-xs">
                {invoice.invoiceNumber}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <PermissionGate codename="view_collections" showFallback={false}>
                <DropdownMenuItem onClick={() => handleViewPayment(payment)}>
                  <Eye className="mr-2 w-4 h-4" />
                  View Details
                </DropdownMenuItem>
              </PermissionGate>

              <PermissionGate codename="add_collections" showFallback={false}>
                <DropdownMenuItem 
                  onClick={() => handleRefundPayment(payment)}
                  className={(() => {
                    // Check if payment is already refunded (negative amount)
                    const isRefunded = typeof payment.amountPaid === 'number' 
                      ? payment.amountPaid < 0 
                      : parseFloat(payment.amountPaid.toString().replace(/[^0-9.-]+/g, '')) < 0;
                    return isRefunded ? 'hidden' : '';
                  })()}
                >
                  <RotateCcw className="mr-2 w-4 h-4" />
                  Refund Payment
                </DropdownMenuItem>
              </PermissionGate>

              {payment.receiptUrl && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleDownloadReceipt(payment)}
                  >
                    <Download className="mr-2 w-4 h-4" />
                    Download Receipt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendReceipt(payment)}>
                    <Send className="mr-2 w-4 h-4" />
                    Send Receipt
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-none w-[80vw] h-[85vh] overflow-y-auto mt-10">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex gap-3 items-center">
            <div className="flex gap-2 items-center">
              <User className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold">
                {groupedPayment.personName}
              </span>
            </div>
            <Badge variant="outline" className="ml-auto">
              {groupedPayment.totalPayments} Payments
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4 h-full">
          {/* Person Summary Card */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex gap-3 items-center">
                <div className="flex justify-center items-center w-10 h-10 bg-blue-100 rounded-full">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {groupedPayment.personName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {groupedPayment.personType}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-full">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Contact</h3>
                  <p className="text-sm text-gray-600">
                    {groupedPayment.personEmail}
                  </p>
                  <p className="text-sm text-gray-600">
                    {groupedPayment.personPhone}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <div className="flex justify-center items-center w-10 h-10 bg-purple-100 rounded-full">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Total Amount</h3>
                  <p className="text-lg font-bold text-purple-600">
                    {defaultCurrency.symbol} {groupedPayment.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards - Matching payments.tsx design */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <FeatureCard
              icon={Receipt}
              title="Total Payments"
              value={groupedPayment.totalPayments}
            />

            <FeatureCard
              icon={DollarSign}
              title="Total Amount"
              value={`${defaultCurrency.symbol} ${groupedPayment.totalAmount.toFixed(2)}`}
            />

            <FeatureCard
              icon={Calendar}
              title="Average Payment"
              value={`${defaultCurrency.symbol} ${(
                groupedPayment.totalAmount / groupedPayment.totalPayments
              ).toFixed(2)}`}
            />

            <FeatureCard
              icon={Clock}
              title="Last Payment"
              value={groupedPayment.lastPaymentDate ? format(new Date(groupedPayment.lastPaymentDate), "MMM dd") : "N/A"}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 items-start sm:flex-row sm:items-center">
            <div className="flex gap-2 items-center">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select
                value={selectedInvoice}
                onValueChange={setSelectedInvoice}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by invoice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Invoices</SelectItem>
                  {uniqueInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm">
              <Download className="mr-2 w-4 h-4" />
              Export
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-hidden flex-1">
            <DataTable
              columns={columns}
              data={{
                data: {
                  count: filteredPayments.length,
                  results: filteredPayments,
                },
              }}
              isLoading={false}
              isError={false}
              options={[]}
              tableKey="person-payments"
              searchableColumnIds={["paymentNumber", "property.unit", "property.projectName"]}
              searchableColumnsSetters={[() => {}]}
            />
          </div>
        </div>
      </DialogContent>

      {/* Credit Note Modal for Refunds */}
      <CreditNoteModal
        open={isCreditNoteModalOpen}
        onClose={() => {
          setIsCreditNoteModalOpen(false);
          setSelectedPaymentForRefund(null);
        }}
        payment={selectedPaymentForRefund}
      />
    </Dialog>
  );
};

export default PersonPaymentsModal;
