"use client";

import { AlertTriangle, CheckCircle, Clock, FileText, Receipt } from 'lucide-react';

import { getOwnerInvoices } from '@/actions/clients/ownerDashboardAction';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';

import type {
  OwnerInvoiceApiResponse,
  OwnerInvoiceSummary,
  OwnerInvoice,
} from "./schema/ownerInvoiceSchema";

interface OwnerInvoicesProps {
  ownerId: string;
}

// Stats Card Component for reuse
interface OwnerInvoiceStatsCardsProps {
  summary: OwnerInvoiceSummary;
  invoices: OwnerInvoice[];
}

const OwnerInvoiceStatsCards = ({ summary }: OwnerInvoiceStatsCardsProps) => {
  return (
    <div className="gap-3 grid md:grid-cols-2 lg:grid-cols-4">
      <Card className="relative bg-blue-100 hover:bg-blue-200 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-md">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex flex-col justify-between items-start">
                  <h3 className="font-medium text-xs">Total Invoices</h3>
                  <span className="font-semibold text-lg tracking-tight">
                    {summary.total_invoices}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <p className="text-gray-500 text-xs">
                Total invoices generated for this owner
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative bg-green-100 hover:bg-green-200 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-md">
                  <Receipt className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex flex-col justify-between items-start">
                  <h3 className="font-medium text-xs">Total Receipts</h3>
                  <span className="font-semibold text-lg tracking-tight">
                    {summary.total_receipts}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <p className="text-gray-500 text-xs">
                Total receipts received for this owner
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative bg-green-50 hover:bg-green-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-green-100 p-2 rounded-md">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex flex-col justify-between items-start">
                  <h3 className="font-medium text-xs">Paid Invoices</h3>
                  <span className="font-semibold text-green-600 text-lg tracking-tight">
                    {summary.total_paid}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <p className="text-gray-500 text-xs">
                Total paid invoices for this owner
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="relative bg-red-50 hover:bg-red-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-red-100 p-2 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex flex-col justify-between items-start">
                  <h3 className="font-medium text-xs">Total Outstanding</h3>
                  <span className="font-semibold text-red-600 text-lg tracking-tight">
                    {summary.total_outstanding}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-1">
              <p className="text-gray-500 text-xs">Pending + overdue amounts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const OwnerInvoices = ({ ownerId }: OwnerInvoicesProps) => {
  const {
    data: apiData,
    isLoading,
    isError,
  } = useQuery<OwnerInvoiceApiResponse>({
    queryKey: ["owner-invoices", ownerId],
    queryFn: () => getOwnerInvoices(ownerId),
    enabled: !!ownerId,
  });

  

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center space-y-4 min-h-[400px]">
        <FileText className="w-16 h-16 text-muted-foreground animate-pulse" />
        <div className="text-center">
          <h3 className="font-semibold text-lg">Loading Invoices...</h3>
        </div>
      </div>
    );
  }

  const isApiError = (data: unknown): data is { error: boolean } => {
    return (
      typeof data === "object" &&
      data !== null &&
      "error" in (data as Record<string, unknown>) &&
      typeof (data as Record<string, unknown>).error === "boolean"
    );
  };

  if (isError || !apiData || (isApiError(apiData) && apiData.error)) {
    return (
      <div className="flex flex-col justify-center items-center space-y-4 min-h-[400px]">
        <FileText className="w-16 h-16 text-muted-foreground" />
        <div className="text-center">
          <h3 className="font-semibold text-lg">Failed to load invoices</h3>
          <p className="text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    );
  }

  const summary: OwnerInvoiceSummary = (
    apiData as unknown as OwnerInvoiceApiResponse
  ).data;
  const invoices: OwnerInvoice[] = summary.invoices || [];

  // Helper: format currency string (use as-is from API, fallback to 'KES 0')
  const formatCurrency = (amount: string) => amount || "KES 0";

  // Helper: format date (use as-is from API, fallback to '-')
  const formatDate = (dateString: string) => dateString || "-";

  // Status helpers (use status from API)
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "partial":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "overdue":
        return <AlertTriangle className="w-4 h-4" />;
      case "partial":
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center space-y-4 min-h-[400px]">
        <FileText className="w-16 h-16 text-muted-foreground" />
        <div className="text-center">
          <h3 className="font-semibold text-lg">No Invoices Found</h3>
          <p className="text-muted-foreground">
            No service invoices have been generated for this owner yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Invoices & Bills
          </h1>
          <p className="text-muted-foreground">
            Service invoices and outstanding payments
          </p>
        </div>
      </div>

      {/* Invoice Statistics */}
      <OwnerInvoiceStatsCards summary={summary} invoices={invoices} />

      {/* All Invoices - Redesigned as grid with popover for receipts */}
      <Card className="relative bg-transparent hover:bg-gray-50/50 shadow-none border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            All Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
            {invoices.map((invoice) => {
              const hasReceipts =
                invoice.receipts && invoice.receipts.length > 0;
              const InvoiceBox = (
                <div
                  key={invoice.id}
                  className="group relative bg-gray-50/80 hover:bg-gray-100/80 p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      {getStatusIcon(invoice.status)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {invoice.invoice_number}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {invoice.property_name}
                      </div>
                    </div>
                  </div>
                  <div className="mb-2 text-muted-foreground text-xs">
                    {invoice.description}
                  </div>
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">Issued</span>
                      <span className="text-xs">
                        {formatDate(invoice.issue_date)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">Due</span>
                      <span className="text-xs">
                        {formatDate(invoice.due_date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-gray-200 border-t">
                    <div>
                      <div className="font-semibold text-sm">
                        {formatCurrency(invoice.total_amount)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Balance: {formatCurrency(invoice.balance)}
                      </div>
                    </div>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              );
              if (!hasReceipts) {
                return InvoiceBox;
              }
              // With receipts, wrap in popover
              return (
                <Popover key={invoice.id}>
                  <PopoverTrigger asChild>
                    <div className="cursor-pointer">{InvoiceBox}</div>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80">
                    <div className="mb-2">
                      <div className="mb-1 font-semibold text-base">
                        Receipts
                      </div>
                      <div className="space-y-2">
                        {invoice.receipts.map((receipt) => (
                          <div
                            key={receipt.id}
                            className="pb-2 last:pb-0 border-b last:border-b-0"
                          >
                            <div className="mb-1 font-medium text-sm">
                              {receipt.receipt_number}
                            </div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-gray-600 text-xs">
                                Amount
                              </span>
                              <span className="font-semibold text-green-700 text-sm">
                                {formatCurrency(receipt.paid_amount)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-gray-600 text-xs">
                                Date
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {receipt.payment_date}
                              </span>
                            </div>
                            {receipt.notes && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-xs">
                                  Notes
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {receipt.notes}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Summary by Type (if invoice_type exists) */}
      {/* This section is omitted since invoice_type is not in the schema. Add if needed. */}
    </div>
  );
};

export default OwnerInvoices;
