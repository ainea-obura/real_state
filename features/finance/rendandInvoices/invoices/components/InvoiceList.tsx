"use client";

import { useAtom } from 'jotai';
import {
    AlertTriangle, CheckCircle, Clock, Coins, Download, Eye, FileSpreadsheet, FileText, Plus, Receipt, Settings, XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    cancelInvoice, deleteInvoice, fetchInvoiceStats, fetchInvoiceTable,
} from '@/actions/finance/invoice';
import { DataTable } from '@/components/datatable/data-table';
import { DateRangePicker } from '@/components/date-range-picker';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Header from "@/features/projects/profile/tabs/Components/structure/header";
import FeatureCard from "@/features/property/tabs/components/featureCard";

import { columns } from "../columns";
import EditInvoiceModal from "./EditInvoiceModal";
import SendInvoiceModal from "./SendInvoiceModal";
import CreditNoteModal from "./CreditNoteModal";
import InvoiceExcelUploadModal from "./InvoiceExcelUploadModal";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { InvoiceStats, InvoiceTableItem, InvoiceTableResponse } from "@/features/finance/scehmas/invoice";
import { pageIndexAtom, pageSizeAtom } from "@/store";
import { ConfirmationDialog } from "./confirmation-dialog";
import VerifyCollectionModal from "./VerifyCollectionModal";
import { date } from 'zod';

// Types
interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "rent" | "utility" | "service" | "penalty" | "credit" | "owner";
  recipient: {
    name: string;
    email: string;
    phone: string;
    type: "tenant" | "owner";
  };
  property: {
    unit: string;
    projectName: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate: string;
  issueDate: string;
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
  paymentMethod?: string;
  paidDate?: string;
  notes?: string;
  recurring?: {
    frequency: "monthly" | "quarterly" | "yearly";
    endDate?: string;
  };
  template?: string;
}

interface InvoiceData {
  count: number;
  results: Invoice[];
}

interface DateRange {
  from?: Date;
  to?: Date;
}

interface InvoiceListProps {
  statusOptions?: { label: string; value: string }[];
  typeOptions?: { label: string; value: string }[];
  onCreateNew: () => void;
  onEditInvoice: (invoice: any) => void;
  onViewInvoice: (invoice: any) => void;
  onOpenSettings: () => void;
}

const defaultStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Rent",  value: "rent" },
  { label: "Partial", value: "partial" },
  { label: "Deposit", value: "deposit" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Issued", value: "issued" },
];

const defaultTypeOptions: { label: string; value: string; }[] | undefined = [
  // { label: "Rent", value: "rent" },
  // { label: "Utility", value: "utility" },
  // { label: "Service", value: "service" },
  // { label: "Penalty", value: "penalty" },
  // { label: "Credit", value: "credit" },
  // { label: "Owner", value: "owner" },
];

const InvoiceList = ({
  statusOptions = defaultStatusOptions,
  typeOptions = defaultTypeOptions,
  onCreateNew,
  onEditInvoice,
  onViewInvoice,
  onOpenSettings,
}: InvoiceListProps) => {
  // Helper to get the first day of the current month
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateRange, setDateRange] = useState<DateRange>({
    from: firstDayOfMonth,
    to: today,
  });

  // Fetch invoice stats from API, listening to dateRange
  const {
    data: invoiceStats,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useQuery<InvoiceStats, Error>({
    queryKey: [
      "invoice-stats",
      dateRange.from?.toISOString().slice(0, 10) ?? "",
      dateRange.to?.toISOString().slice(0, 10) ?? "",
    ],
    queryFn: async () => {
      const data = await fetchInvoiceStats({
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
      return data;
    },
  });

  // Fetch invoice table data from API, listening to dateRange and pagination
  const [pageIndex, setPageIndex] = useAtom(pageIndexAtom);
  const [pageSize, setPageSize] = useAtom(pageSizeAtom);
  const {
    data: invoiceTableData,
    isLoading: isTableLoading,
    isError: isTableError,
  } = useQuery<InvoiceTableResponse, Error>({
    queryKey: [
      "invoice-table",
      dateRange.from?.toISOString().slice(0, 10) ?? "",
      dateRange.to?.toISOString().slice(0, 10) ?? "",
      pageIndex,
      pageSize,
    ],
    queryFn: async () => {
      const result = await fetchInvoiceTable({
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
      });
      return result;
    },
  });

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<InvoiceTableItem | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendInvoice, setSendInvoice] = useState<InvoiceTableItem | null>(null);
  const [sendMode, setSendMode] = useState<"send" | "resend">("send");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<InvoiceTableItem | null>(null);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditInvoice, setCreditInvoice] = useState<InvoiceTableItem | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [verifyCollectionModal, setVerifyCollectionModal] = useState<InvoiceTableItem | null>(null);
  const [excelUploadModalOpen, setExcelUploadModalOpen] = useState(false);

  // Stat card values (fallback to 0 if loading/error)
  const totalInvoices = invoiceStats?.totalInvoices ?? 0;
  const totalAmount = invoiceStats?.totalAmount ?? 0;
  const paidAmount = invoiceStats?.paidAmount ?? 0;
  const outstandingAmount = invoiceStats?.outstandingAmount ?? 0;
  const draftInvoices = invoiceStats?.draftInvoices ?? 0;
  const sentInvoices = invoiceStats?.sentInvoices ?? 0;
  const paidInvoices = invoiceStats?.paidInvoices ?? 0;
  const overdueInvoices = invoiceStats?.overdueInvoices ?? 0;

  const queryClient = useQueryClient();
  // State for delete/cancel modals
  const [deleteInvoiceModal, setDeleteInvoiceModal] = useState<InvoiceTableItem | null>(null);
  const [cancelInvoiceModal, setCancelInvoiceModal] = useState<InvoiceTableItem | null>(null);

  // Delete mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => deleteInvoice(invoiceId),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["invoice-table"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      setDeleteInvoiceModal(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete invoice");
    },
  });

  // Cancel mutation (now uses real API)
  const cancelInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => cancelInvoice(invoiceId),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["invoice-table"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      setCancelInvoiceModal(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel invoice");
    },
  });

  const handleDateRangeUpdate = (values: {
    range: DateRange;
    rangeCompare?: DateRange;
  }) => {
    console.log("=== handleDateRangeUpdate CALLED ===");
    console.log("Values received:", values);
    console.log("Current dateRange state:", dateRange);
    console.log("Values.range:", values.range);
    console.log("Values.range.from:", values.range.from);
    console.log("Values.range.to:", values.range.to);
    
    setDateRange(values.range);
    
    // Force refetch both queries when date range changes
    setTimeout(() => {
      console.log("=== FORCING REFETCH ===");
      console.log("New dateRange state:", dateRange);
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-table"] });
    }, 100);
  };

  const handleExport = (format: string) => {
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return <FileText className="w-4 h-4" />;
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "partial":
        return <AlertTriangle className="w-4 h-4" />;
      case "overdue":
        return <AlertTriangle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Helper to determine if invoice can be deleted or cancelled
  const canDelete = (status: string) => ["draft", "issued"].includes(status.toLowerCase());
  const canCancel = (status: string) => ["draft", "issued"].includes(status.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Header with integrated filters */}
      <Header
        title="Invoices"
        description="Create & manage tenant and owner invoices"
      >
        <div className="flex gap-3 items-center">
          {/* Date Range Picker */}
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={handleDateRangeUpdate}
            showCompare={false}
          />

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10">
                <Download className="mr-2 w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("PDF")}>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("Excel")}>Export as Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("CSV")}>Export as CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Button */}
          <Button 
            variant="outline" 
            onClick={onOpenSettings} 
            className="h-10"
          >
            <Settings className="mr-2 w-4 h-4" />
            Settings
          </Button>

          {/* Excel Upload Button */}
          <PermissionGate codename="add_invoices" showFallback={false}>
            <Button 
              onClick={() => setExcelUploadModalOpen(true)} 
              variant="outline"
              className="h-10"
            >
              <FileSpreadsheet className="mr-2 w-4 h-4" />
              Upload Excel
            </Button>
          </PermissionGate>

          {/* Create Invoice Button */}
          <PermissionGate codename="add_invoices" showFallback={false}>
            <Button onClick={onCreateNew} className="h-10">
              <Plus className="mr-2 w-4 h-4" />
              New Invoice
            </Button>
          </PermissionGate>
        </div>
      </Header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={Receipt}
          title="Total Invoices"
          value={isStatsLoading ? "..." : totalInvoices}
        />
        <FeatureCard
          icon={Coins}
          title="Total Amount"
          value={totalAmount}
          desc="All Invoices"
        />
        <FeatureCard
          icon={CheckCircle}
          title="Paid"
          value={paidAmount}
          desc={`${outstandingAmount} Outstanding`}
        />
        <FeatureCard
          icon={AlertTriangle}
          title="Overdue"
          value={isStatsLoading ? "..." : overdueInvoices}
          desc="Requires Attention"
        />
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="flex gap-3 items-center p-4 bg-gray-50 rounded-lg">
          {getStatusIcon("draft")}
          <div>
            <div className="font-semibold">
              {isStatsLoading ? "..." : draftInvoices}
            </div>
            <div className="text-sm text-gray-600">Draft</div>
          </div>
        </div>
        <div className="flex gap-3 items-center p-4 bg-blue-100 rounded-lg">
          {getStatusIcon("sent")}
          <div>
            <div className="font-semibold">
              {isStatsLoading ? "..." : sentInvoices}
            </div>
            <div className="text-sm text-gray-600">Sent</div>
          </div>
        </div>
        <div className="flex gap-3 items-center p-4 bg-green-100 rounded-lg">
          {getStatusIcon("paid")}
          <div>
            <div className="font-semibold">
              {isStatsLoading ? "..." : paidInvoices}
            </div>
            <div className="text-sm text-gray-600">Paid</div>
          </div>
        </div>
        <div className="flex gap-3 items-center p-4 bg-red-100 rounded-lg">
          {getStatusIcon("overdue")}
          <div>
            <div className="font-semibold">
              {isStatsLoading ? "..." : overdueInvoices}
            </div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns({
          onEdit: (invoice) => {
            onEditInvoice(invoice);
          },
          onSend: (invoice, mode = "send") => {
            setSendInvoice(invoice);
            setSendMode(mode);
            setSendModalOpen(true);
          },
          onView: (invoice) => {
            onViewInvoice(invoice);
          },
          onCredit: (invoice) => {
            setCreditInvoice(invoice);
            setCreditModalOpen(true);
          },
          onDelete: (invoice) => {
            if (canDelete(invoice.status)) setDeleteInvoiceModal(invoice);
          },
          onCancel: (invoice) => {
            if (canCancel(invoice.status)) setCancelInvoiceModal(invoice);
          },
          onVerifyCollection: (invoice) => {
            setVerifyCollectionModal(invoice);
          },
        })}
        data={{ data: invoiceTableData ?? { count: 0, results: [] } }}
        isLoading={isTableLoading}
        isError={isTableError}
        options={[...statusOptions, ...typeOptions]}
        tableKey="invoices"
        searchableColumnIds={[
          "invoiceNumber",
          "recipient.name",
          "property.unit",
        ]}
        searchableColumnsSetters={[() => {}]}
        isUpper={false}
      />

      {/* Modals */}
      {editInvoice && (
        <EditInvoiceModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          invoice={editInvoice}
        />
      )}

      {sendInvoice && (
        <SendInvoiceModal
          open={sendModalOpen}
          onClose={() => setSendModalOpen(false)}
          invoice={sendInvoice}
          mode={sendMode}
        />
      )}



      {creditInvoice && (
        <CreditNoteModal
          open={creditModalOpen}
          onClose={() => setCreditModalOpen(false)}
          invoice={creditInvoice}
        />
      )}

      {verifyCollectionModal && (
        <VerifyCollectionModal
          open={!!verifyCollectionModal}
          onClose={() => setVerifyCollectionModal(null)}
          invoice={verifyCollectionModal}
        />
      )}

      {/* Delete Invoice Confirmation */}
      {deleteInvoiceModal && (
        <ConfirmationDialog
          open={!!deleteInvoiceModal}
          onClose={() => setDeleteInvoiceModal(null)}
          onConfirm={() => deleteInvoiceMutation.mutate(deleteInvoiceModal.id)}
          title={`Delete Invoice #${deleteInvoiceModal.invoiceNumber}`}
          description={`Are you sure you want to delete invoice #${deleteInvoiceModal.invoiceNumber}? This action cannot be undone. Only draft and issued invoices can be deleted.`}
          invoiceNumber={deleteInvoiceModal.invoiceNumber}
          loading={deleteInvoiceMutation.isPending}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          icon={<XCircle className="w-6 h-6 text-destructive" />}
          confirmColor="destructive"
          confirmationPhrase="DELETE"
        />
      )}
      {/* Cancel Invoice Confirmation */}
      {cancelInvoiceModal && (
        <ConfirmationDialog
          open={!!cancelInvoiceModal}
          onClose={() => setCancelInvoiceModal(null)}
          onConfirm={() => cancelInvoiceMutation.mutate(cancelInvoiceModal.id)}
          title={`Cancel Invoice #${cancelInvoiceModal.invoiceNumber}`}
          description={`Are you sure you want to cancel invoice #${cancelInvoiceModal.invoiceNumber}? This will mark the invoice as cancelled. Only draft and issued invoices can be cancelled.`}
          invoiceNumber={cancelInvoiceModal.invoiceNumber}
          loading={cancelInvoiceMutation.isPending}
          confirmLabel="Cancel Invoice"
          cancelLabel="Back"
          icon={<AlertTriangle className="w-6 h-6 text-yellow-500" />}
          confirmColor="warning"
          confirmationPhrase="CANCEL"
        />
      )}

      {/* Excel Upload Modal */}
      <InvoiceExcelUploadModal
        isOpen={excelUploadModalOpen}
        onClose={() => setExcelUploadModalOpen(false)}
        onInvoicesUpdated={() => {
          // Refresh the invoice list
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
        }}
      />
    </div>
  );
};

export default InvoiceList; 