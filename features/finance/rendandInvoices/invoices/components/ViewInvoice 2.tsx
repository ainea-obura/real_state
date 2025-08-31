"use client";

import { Building, Download, User } from 'lucide-react';
import { toast } from 'sonner';

import { downloadInvoicePDF } from '@/actions/finance/invoice';
import { getCurrencyDropdown } from '@/actions/projects/index';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';

import type { InvoiceTableItem } from "@/features/finance/scehmas/invoice";

interface ViewInvoiceProps {
  invoice: InvoiceTableItem;
}

const ViewInvoice = ({ invoice }: ViewInvoiceProps) => {
  // Fetch default currency using useQuery
  const { data: currencies } = useQuery({
    queryKey: ["currency-dropdown"],
    queryFn: async () => {
      const response = await getCurrencyDropdown();
      return response;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Download PDF mutation
  const downloadMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const result = await downloadInvoicePDF(invoiceId);

      if (result.error) {
        throw new Error(result.message || "Failed to download PDF");
      }

      if (!result.data) {
        throw new Error("No download data received");
      }

      // Use the proxy endpoint directly (no need for manual token handling)
      const response = await fetch(result.data.downloadUrl, {
        method: "GET",
        // No need to add Authorization header - the proxy handles it
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(errorData.message || "Failed to download PDF");
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();

      // Create download link
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = result.data.filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(blobUrl);

      return result.data.filename;
    },
    onSuccess: (filename) => {
      toast.success(`PDF downloaded successfully: ${filename}`);
    },
    onError: (error: Error) => {
      console.error("Download error:", error);
      toast.error(error.message || "Failed to download PDF");
    },
  });

  const defaultCurrency =
    currencies && currencies.length > 0
      ? { code: currencies[0].code, symbol: currencies[0].symbol }
      : { code: "KES", symbol: "KES" };

  const getStatusBadge = (status: string) => {
    console.log("status", status);
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      sent: { label: "Sent", className: "bg-blue-100 text-blue-800" },
      viewed: { label: "Viewed", className: "bg-purple-100 text-purple-800" },
      paid: { label: "Paid", className: "bg-green-100 text-green-800" },
      overdue: { label: "Overdue", className: "bg-red-100 text-red-800" },
      cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600" },
      partial: { label: "Partial", className: "bg-yellow-100 text-yellow-800" },
    };

    const normalizedStatus = status.toLowerCase() as keyof typeof statusConfig;
    const config = statusConfig[normalizedStatus] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
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

  // Calculate subtotal from items (before discount and tax)
  const calculateSubtotal = () => {
    if (typeof invoice.subtotal === "number") {
      return invoice.subtotal;
    }
    // Calculate from items: sum of (amount * quantity) for each item
    return invoice.items.reduce(
      (sum, item) => sum + (item.amount || 0) * (item.quantity || 1),
      0
    );
  };

  const calculateTax = () => {
    if (typeof invoice.tax === "number") {
      return invoice.tax;
    }
    // Calculate tax from percentage if tax amount is not available
    if (
      typeof invoice.tax_percentage === "number" &&
      invoice.tax_percentage > 0
    ) {
      return (subtotal * invoice.tax_percentage) / 100;
    }
    return 0; // Default tax calculation if needed
  };

  const calculateDiscount = () => {
    if (typeof invoice.discount === "number") {
      return invoice.discount;
    }
    return 0; // Default discount calculation if needed
  };

  const calculateTotal = () => {
    if (typeof invoice.total === "number") {
      return invoice.total;
    }
    // If backend total is not available, calculate it
    return calculateSubtotal() - calculateDiscount() + calculateTax();
  };

  const subtotal = calculateSubtotal();
  const tax = calculateTax();
  const discount = calculateDiscount();
  const total = calculateTotal();

  const handleDownload = () => {
    downloadMutation.mutate(invoice.id);
  };

  return (
    <div className="w-full">
      <div className="w-full">
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8">
          {/* Invoice Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-gray-900 text-3xl">INVOICE</h1>
              {getStatusBadge(invoice.status)}
            </div>
            <div className="text-gray-600 text-lg">
              #{invoice.invoiceNumber}
            </div>
            <div className="text-gray-500 text-sm">
              {getTypeLabel(invoice.type)} Invoice
            </div>
          </div>

          {/* Download Button */}
          <Button
            className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
            onClick={handleDownload}
            disabled={downloadMutation.isPending}
          >
            <Download className="mr-2 w-4 h-4" />
            {downloadMutation.isPending ? "Generating..." : "Download PDF"}
          </Button>
        </div>

        {/* Invoice Details Grid */}
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-2 mb-8">
          {/* Recipient Information */}
          <div className="bg-white p-4 border border-gray-200 rounded-lg">
            <h3 className="flex items-center gap-2 mb-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">
              <User className="w-4 h-4" />
              Bill To
            </h3>
            <div className="space-y-1">
              <div className="font-medium text-gray-900">
                {invoice.recipient.name}
              </div>
              <div className="text-gray-600 text-sm">
                {invoice.recipient.email}
              </div>
              <div className="text-gray-600 text-sm">
                {invoice.recipient.phone}
              </div>
              <div className="text-gray-600 text-sm capitalize">
                {invoice.recipient.type}
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="bg-white p-4 border border-gray-200 rounded-lg">
            <h3 className="flex items-center gap-2 mb-3 font-semibold text-gray-700 text-sm uppercase tracking-wide">
              <Building className="w-4 h-4" />
              Property
            </h3>
            <div className="space-y-1">
              <div className="font-medium text-gray-900">
                {invoice.property.unit}
              </div>
              <div className="text-gray-600 text-sm">
                {invoice.property.projectName}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="bg-white mb-8 border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wide">
                  Description
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wide">
                  Type
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wide">
                  Month
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wide">
                  Amount
                </th>
                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wide">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900 text-sm whitespace-nowrap">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 text-gray-900 text-sm text-center capitalize whitespace-nowrap">
                    {item.type}
                  </td>
                  <td className="px-6 py-4 text-gray-900 text-sm text-center whitespace-nowrap">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 text-gray-900 text-sm text-right whitespace-nowrap">
                    {defaultCurrency.symbol} {item.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 text-sm text-right whitespace-nowrap">
                    {defaultCurrency.symbol}{" "}
                    {(item.amount * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {defaultCurrency.symbol} {subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-red-600">
                    - {defaultCurrency.symbol} {discount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium text-green-600">
                    + {defaultCurrency.symbol} {tax.toFixed(2)}
                  </span>
                </div>
                <div className="pt-3 border-gray-200 border-t">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>
                      {defaultCurrency.symbol} {total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewInvoice;
