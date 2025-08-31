"use client";

import { useAtom } from 'jotai';
import { Clock, Coins, Download, Plus, Users, Grid3X3, DollarSign } from 'lucide-react';
import { useState, useMemo } from 'react';

import { fetchPaymentStats, fetchPaymentTable } from '@/actions/finance/payment';
import { getCurrencyDropdown } from '@/actions/projects/index';
import { DataTable } from '@/components/datatable/data-table';
import { DateRangePicker } from '@/components/date-range-picker';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { pageIndexAtom, pageSizeAtom } from '@/store';
import { useQuery } from '@tanstack/react-query';

import { createColumns, createGroupedColumns } from './columns';
import CancelPaymentModal from './components/CancelPaymentModal';
import CreatePaymentModal from './components/CreatePaymentModal';
import CreditNoteModal from './components/CreditNoteModal';
import EditPaymentModal from './components/EditPaymentModal';
import RefundPaymentModal from './components/RefundPaymentModal';
import RetryPaymentModal from './components/RetryPaymentModal';
import SendReceiptModal from './components/SendReceiptModal';
import ViewPaymentModal from './components/ViewPaymentModal';
import PersonPaymentsModal from './components/PersonPaymentsModal';

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
  paymentMethod:
    | "cash"
    | "bank_transfer"
    | "online"
    | "evc_plus"
    | "mpesa"
    | "other";
  amountPaid: string;
  amountPaidNoCurrency: number;
  invoicesApplied: {
    id: string;
    invoiceNumber: string;
    amount: number;
  }[];
  balanceRemaining: number;
  status: "success" | "failed" | "refunded" | "partial" | "pending";
  notes?: string;
  receiptUrl?: string;
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

interface PaymentData {
  count: number;
  results: Payment[];
}

interface PaymentsProps {
  statusOptions?: { label: string; value: string }[];
  methodOptions?: { label: string; value: string }[];
}

const Payments = ({}: PaymentsProps) => {
  // Date range state (like invoices.tsx)
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: firstDayOfMonth,
    to: today,
  });
  // Pagination state (like invoices.tsx)
  const [pageIndex, setPageIndex] = useAtom(pageIndexAtom);
  const [pageSize, setPageSize] = useAtom(pageSizeAtom);

  // Grouping state
  const [isGrouped, setIsGrouped] = useState(false);
  const [selectedGroupedPayment, setSelectedGroupedPayment] = useState<GroupedPayment | null>(null);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);
  const [isSendReceiptModalOpen, setIsSendReceiptModalOpen] = useState(false);
  
  // Credit note modal state
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);

  // Fetch payment stats with useQuery (unchanged)
  const {
    data: paymentStats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    error: statsErrorObj,
  } = useQuery({
    queryKey: [
      "payment-stats",
      dateRange.from?.toISOString?.() ?? dateRange.from ?? "",
      dateRange.to?.toISOString?.() ?? dateRange.to ?? "",
    ],
    queryFn: async () => {
      return await fetchPaymentStats({
        from: dateRange.from
          ? typeof dateRange.from === "string"
            ? dateRange.from
            : dateRange.from.toISOString().slice(0, 10)
          : undefined,
        to: dateRange.to
          ? typeof dateRange.to === "string"
            ? dateRange.to
            : dateRange.to.toISOString().slice(0, 10)
          : undefined,
      });
    },
  });

  // Fetch payment data
  const { data: paymentData, isLoading, error } = useQuery({
    queryKey: ["payment-table", dateRange],
    queryFn: () => fetchPaymentTable({
      from: dateRange.from
        ? typeof dateRange.from === "string"
          ? dateRange.from
          : dateRange.from.toISOString().slice(0, 10)
        : undefined,
      to: dateRange.to
        ? typeof dateRange.to === "string"
          ? dateRange.to
          : dateRange.to.toISOString().slice(0, 10)
        : undefined,
      page: pageIndex + 1,
      pageSize: pageSize,
    }),
  });

  // Get default currency
  const defaultCurrency = { code: "KES", symbol: "KES" };

  // Group payments by person
  const groupedPayments = useMemo(() => {
    if (!paymentData?.results) return [];
    
    const groups = paymentData.results.reduce((acc, payment) => {
      const personKey = `${payment.tenant.name}-${payment.tenant.email}`;
      
      if (!acc[personKey]) {
        acc[personKey] = {
          personId: personKey,
          personName: payment.tenant.name,
          personEmail: payment.tenant.email,
          personPhone: payment.tenant.phone,
          personType: "tenant" as const,
          totalPayments: 0,
          totalAmount: 0,
          lastPaymentDate: "",
          payments: []
        };
      }
      
      acc[personKey].payments.push(payment);
      acc[personKey].totalPayments++;
      acc[personKey].totalAmount += payment.amountPaidNoCurrency || 0;
      
      // Track latest payment date
      const paymentDate = new Date(payment.paymentDate);
      if (!acc[personKey].lastPaymentDate || 
          paymentDate > new Date(acc[personKey].lastPaymentDate)) {
        acc[personKey].lastPaymentDate = payment.paymentDate;
      }
      
      return acc;
    }, {} as Record<string, GroupedPayment>);
    
    return Object.values(groups);
  }, [paymentData]);

  const handleCreatePayment = () => {
    setIsCreateModalOpen(true);
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsViewModalOpen(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsEditModalOpen(true);
  };

  const handleRetryPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsRetryModalOpen(true);
  };

  const handleRefundPayment = (payment: Payment) => {
    // Pass the payment data directly to the credit note modal
    setSelectedPayment(payment);
    setIsCreditNoteModalOpen(true);
  };

  const handleCancelPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsCancelModalOpen(true);
  };

  const handleDownloadReceipt = (payment: Payment) => {
    // TODO: Implement receipt download
    if (payment.receiptUrl) {
      // Trigger download
      window.open(payment.receiptUrl, "_blank");
    }
  };

  const handleSendReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsSendReceiptModalOpen(true);
  };

  const handleViewPersonPayments = (groupedPayment: GroupedPayment) => {
    setSelectedGroupedPayment(groupedPayment);
    setIsPersonModalOpen(true);
  };

  const handleExport = (format: string) => {};

  // Create columns with handlers (unchanged)
  const columns = createColumns({
    onView: handleViewPayment,
    onEdit: handleEditPayment,
    onRetry: handleRetryPayment,
    onRefund: handleRefundPayment,
    onCancel: handleCancelPayment,
    onDownloadReceipt: handleDownloadReceipt,
    onSendReceipt: handleSendReceipt,
    defaultCurrency,
  });

  const groupedColumns = createGroupedColumns({
    onView: handleViewPayment,
    onEdit: handleEditPayment,
    onRetry: handleRetryPayment,
    onRefund: handleRefundPayment,
    onCancel: handleCancelPayment,
    onDownloadReceipt: handleDownloadReceipt,
    onSendReceipt: handleSendReceipt,
    onViewPersonPayments: handleViewPersonPayments,
    defaultCurrency,
  });

  // Filter options for the DataTable (unchanged)
  const filterOptions = [
    {
      label: "Status",
      value: "status",
      options: [
        { label: "All Status", value: "" },
        { label: "Success", value: "success" },
        { label: "Failed", value: "failed" },
        { label: "Refunded", value: "refunded" },
        { label: "Partial", value: "partial" },
        { label: "Pending", value: "pending" },
      ],
    },
    {
      label: "Payment Method",
      value: "paymentMethod",
      options: [
        { label: "All Methods", value: "" },
        { label: "Cash", value: "cash" },
        { label: "Bank Transfer", value: "bank_transfer" },
        { label: "Online", value: "online" },
        { label: "EVC+", value: "evc_plus" },
        { label: "M-Pesa", value: "mpesa" },
        { label: "Other", value: "other" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-gray-600">
            Record, view, and manage all collections
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Date Range Picker (like invoices.tsx) */}
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={({ range }) => setDateRange(range)}
            showCompare={false}
          />
          
          {/* Grouping Toggle */}
          <Button
            variant={isGrouped ? "default" : "outline"}
            size="sm"
            onClick={() => setIsGrouped(!isGrouped)}
            className="flex gap-2 items-center"
          >
            {isGrouped ? (
              <>
                <Grid3X3 className="w-4 h-4" />
                Individual View
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Group by Person
              </>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <PermissionGate codename="add_collections" showFallback={false}>
            <Button onClick={handleCreatePayment} size="sm">
              <Plus className="mr-2 w-4 h-4" />
              Record Collection
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Grouping Stats */}
      {/* {isGrouped && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FeatureCard
            icon={Users}
            title="Total People"
            value={groupedPayments.length}
          />
          <FeatureCard
            icon={Coins}
            title="Total Payments"
            value={groupedPayments.reduce((sum, group) => sum + group.totalPayments, 0)}
          />
          <FeatureCard
            icon={DollarSign}
            title="Total Amount"
            value={`${defaultCurrency.symbol} ${groupedPayments.reduce((sum, group) => sum + group.totalAmount, 0).toFixed(2)}`}
          />
        </div>
      )} */}

      {/* Payment Stats Summary Cards (unchanged) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isStatsLoading ? (
          <div className="col-span-4 p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
            Loading payment stats...
          </div>
        ) : isStatsError ? (
          <div className="col-span-4 p-4 text-center text-red-500 bg-red-50 rounded-lg">
            {statsErrorObj?.message || "Failed to load payment stats"}
          </div>
        ) : paymentStats ? (
          <>
            <FeatureCard
              icon={Coins}
              title="Total Payments"
              value={paymentStats.totalPayments}
            />
            <FeatureCard
              icon={Coins}
              title="Total Amount Paid"
              value={`${paymentStats.totalAmountPaid}`}
            />
            <FeatureCard
              icon={Coins}
              title="Outstanding"
              value={`${paymentStats.totalOutstanding}`}
            />
            <FeatureCard
              icon={Clock}
              title="Last Payment"
              value={
                paymentStats.lastPaymentDate
                  ? paymentStats.lastPaymentDate
                  : "-"
              }
            />
          </>
        ) : null}
      </div>

      {/* Data Table */}
      <div className="">
        <DataTable
          columns={isGrouped ? groupedColumns : columns}
          data={{
            data: isGrouped 
              ? { count: groupedPayments.length, results: groupedPayments }
              : paymentData ?? { count: 0, results: [] },
          }}
          isLoading={isLoading}
          isError={error}
          options={filterOptions}
          tableKey={isGrouped ? "grouped-payments" : "payments"}
          searchableColumnIds={isGrouped ? ["personName", "personEmail"] : ["paymentNumber", "tenant.name"]}
          searchableColumnsSetters={[() => {}]}
        />
      </div>

      {/* Modals (unchanged) */}
      <PermissionGate codename="add_collections" showFallback={false}>
        <CreatePaymentModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </PermissionGate>

      {selectedPayment && (
        <>
          <ViewPaymentModal
            open={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedPayment(null);
            }}
            payment={selectedPayment}
          />

          <EditPaymentModal
            open={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedPayment(null);
            }}
            payment={selectedPayment}
          />

          <RefundPaymentModal
            open={isRefundModalOpen}
            onClose={() => {
              setIsRefundModalOpen(false);
              setSelectedPayment(null);
            }}
            payment={selectedPayment}
          />

          <CancelPaymentModal
            open={isCancelModalOpen}
            onClose={() => {
              setIsCancelModalOpen(false);
              setSelectedPayment(null);
            }}
            payment={selectedPayment}
          />

          <RetryPaymentModal
            open={isRetryModalOpen}
            onClose={() => {
              setIsRetryModalOpen(false);
              setSelectedPayment(null);
            }}
            payment={selectedPayment}
          />

          <SendReceiptModal
            open={isSendReceiptModalOpen}
            onClose={() => {
              setIsSendReceiptModalOpen(false);
              setSelectedPayment(null);
            }}
            payment={selectedPayment}
          />
        </>
      )}

      {/* Credit Note Modal */}
      {selectedPayment && (
        <CreditNoteModal
          open={isCreditNoteModalOpen}
          onClose={() => {
            setIsCreditNoteModalOpen(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
        />
      )}

      {/* Person Payments Modal */}
      {selectedGroupedPayment && (
        <PersonPaymentsModal
          open={isPersonModalOpen}
          onClose={() => {
            setIsPersonModalOpen(false);
            setSelectedGroupedPayment(null);
          }}
          groupedPayment={selectedGroupedPayment}
        />
      )}
    </div>
  );
};

export default Payments;
