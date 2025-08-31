"use client";

import {
    Building, Calendar, CreditCard, DollarSign, Download, Edit, Eye, Send, User,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import type { InvoiceTableItem } from "@/features/finance/scehmas/invoice";

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

interface ViewInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceTableItem;
  onEdit?: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
  onCredit?: (invoice: Invoice) => void;
}

const ViewInvoiceModal = ({
  open,
  onClose,
  invoice,
  onEdit,
  onSend,
  onCredit,
}: ViewInvoiceModalProps) => {
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
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      sent: { label: "Sent", className: "bg-blue-100 text-blue-800" },
      viewed: { label: "Viewed", className: "bg-purple-100 text-purple-800" },
      paid: { label: "Paid", className: "bg-green-100 text-green-800" },
      overdue: { label: "Overdue", className: "bg-red-100 text-red-800" },
      cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Invoice Details - {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Actions */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-2xl">INVOICE</h2>
                {getStatusBadge(invoice.status)}
              </div>
              <div className="text-gray-600">#{invoice.invoiceNumber}</div>
              <div className="text-gray-600 text-sm">
                {getTypeLabel(invoice.type)} Invoice
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 w-4 h-4" />
                Download PDF
              </Button>
              {invoice.status === "draft" && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(invoice)}
                >
                  <Edit className="mr-2 w-4 h-4" />
                  Edit
                </Button>
              )}
              {(invoice.status === "draft" ||
                invoice.status === "sent" ||
                invoice.status === "overdue") &&
                onSend && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSend(invoice)}
                  >
                    <Send className="mr-2 w-4 h-4" />
                    Send
                  </Button>
                )}
              {invoice.status !== "paid" && onCredit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCredit(invoice)}
                >
                  <CreditCard className="mr-2 w-4 h-4" />
                  Credit Note
                </Button>
              )}
            </div>
          </div>

          {/* Invoice Information Grid */}
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
            {/* Recipient Information */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg">
                <User className="w-5 h-5" />
                Recipient Information
              </h3>
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="text-gray-600 text-sm">Name</div>
                  <div className="font-medium">{invoice.recipient.name}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Email</div>
                  <div>{invoice.recipient.email}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Phone</div>
                  <div>{invoice.recipient.phone}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Type</div>
                  <Badge variant="outline">{invoice.recipient.type}</Badge>
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg">
                <Building className="w-5 h-5" />
                Property Information
              </h3>
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="text-gray-600 text-sm">Unit</div>
                  <div className="font-medium">{invoice.property.unit}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Project</div>
                  <div>{invoice.property.projectName}</div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg">
                <Calendar className="w-5 h-5" />
                Important Dates
              </h3>
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="text-gray-600 text-sm">Issue Date</div>
                  <div className="font-medium">
                    {formatDate(invoice.issueDate)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Due Date</div>
                  <div className="font-medium">
                    {formatDate(invoice.dueDate)}
                  </div>
                </div>
                {invoice.paidDate && (
                  <div>
                    <div className="text-gray-600 text-sm">Paid Date</div>
                    <div className="font-medium">
                      {formatDate(invoice.paidDate)}
                    </div>
                  </div>
                )}
                {invoice.recurring && (
                  <div>
                    <div className="text-gray-600 text-sm">Recurring</div>
                    <div className="font-medium">
                      {invoice.recurring.frequency}
                      {invoice.recurring.endDate &&
                        ` until ${formatDate(invoice.recurring.endDate)}`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg">
                <DollarSign className="w-5 h-5" />
                Payment Information
              </h3>
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="text-gray-600 text-sm">Total Amount</div>
                  <div className="font-medium text-lg">{invoice.total}</div>
                </div>
                {invoice.paymentMethod && (
                  <div>
                    <div className="text-gray-600 text-sm">Payment Method</div>
                    <div>{invoice.paymentMethod}</div>
                  </div>
                )}
                <div>
                  <div className="text-gray-600 text-sm">Subtotal</div>
                  <div>{invoice.subtotal}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Tax</div>
                  <div>{invoice.tax}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Invoice Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="gap-2 grid grid-cols-12 bg-gray-50 p-3 font-medium text-sm">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {invoice.items.map((item, index) => (
                <div
                  key={index}
                  className="gap-2 grid grid-cols-12 p-3 border-t"
                >
                  <div className="col-span-6">{item.description}</div>
                  <div className="col-span-2 text-center">{item.quantity}</div>
                  <div className="col-span-2 text-right">{item.rate}</div>
                  <div className="col-span-2 font-medium text-right">
                    {item.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Notes</h3>
              <div className="bg-gray-50 p-4 rounded-lg">{invoice.notes}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewInvoiceModal;
