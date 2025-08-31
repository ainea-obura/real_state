"use client";

import { format } from 'date-fns';
import { Download, Receipt } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  amountPaid: number;
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

interface ViewPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: Payment;
}

const ViewPaymentModal = ({
  open,
  onClose,
  payment,
}: ViewPaymentModalProps) => {
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

  const statusConfig = getStatusConfig(payment.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[calc(100vh-150px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Payment Details - {payment.paymentNumber}</span>
            {payment.receiptUrl && (
              <Button variant="outline" size="sm">
                <Download className="mr-2 w-4 h-4" />
                Download Receipt
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
              <div className="text-center">
                <div className="text-gray-600 text-sm">Amount Paid</div>
                <div className="font-bold text-gray-900 text-2xl">
                  {payment.amountPaid}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-600 text-sm">Status</div>
                <Badge className={statusConfig.className}>
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-gray-600 text-sm">Balance</div>
                <div
                  className={`text-2xl font-bold ${
                    payment.balanceRemaining > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {payment.balanceRemaining}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                Payment Information
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-600 text-sm">
                    Payment Number
                  </label>
                  <p className="text-gray-900">{payment.paymentNumber}</p>
                </div>

                <div>
                  <label className="font-medium text-gray-600 text-sm">
                    Payment Date
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(payment.paymentDate), "PPP")}
                  </p>
                </div>

                <div>
                  <label className="font-medium text-gray-600 text-sm">
                    Payment Method
                  </label>
                  <p className="text-gray-900">
                    {getMethodLabel(payment.paymentMethod)}
                  </p>
                </div>

                <div>
                  <label className="font-medium text-gray-600 text-sm">
                    Created By
                  </label>
                  <p className="text-gray-900">{payment.createdBy}</p>
                </div>

                <div>
                  <label className="font-medium text-gray-600 text-sm">
                    Created At
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(payment.createdAt), "PPP 'at' p")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                Tenant Information
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-600 text-sm">
                    Tenant Name
                  </label>
                  <p className="text-gray-900">{payment.tenant.name}</p>
                </div>

                <div>
                  <label className="font-medium text-gray-600 text-sm">
                    Email
                  </label>
                  <p className="text-gray-900">{payment.tenant.email}</p>
                </div>

                <div>
                  <label className="font-medium text-gray-600 text-sm">
                    Phone
                  </label>
                  <p className="text-gray-900">{payment.tenant.phone}</p>
                </div>

                <div>
                  <label className="font-medium text-gray-600 text-sm">
                    Property
                  </label>
                  <p className="text-gray-900">
                    {payment.property.unit} - {payment.property.projectName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoices Applied */}
          {payment.invoicesApplied.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                Invoices Applied ({payment.invoicesApplied.length})
              </h3>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 border-gray-200 border-b">
                  <div className="col-span-6 p-3 border-gray-200 border-r font-medium text-gray-700 text-sm">
                    Invoice Number
                  </div>
                  <div className="col-span-6 p-3 font-medium text-gray-700 text-sm text-center">
                    Amount Applied
                  </div>
                </div>

                <div className="bg-white">
                  {payment.invoicesApplied.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="grid grid-cols-12 border-gray-100 border-b last:border-b-0"
                    >
                      <div className="col-span-6 p-3 border-gray-100 border-r">
                        <div className="font-medium text-sm">
                          {invoice.invoiceNumber}
                        </div>
                      </div>
                      <div className="flex justify-center items-center col-span-6 px-3">
                        <div className="font-medium text-blue-600 text-sm">
                          {invoice.amount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {payment.notes && (
            <div className="space-y-2">
              <label className="font-medium text-gray-600 text-sm">Notes</label>
              <p className="bg-gray-50 p-3 rounded-lg text-gray-900">
                {payment.notes}
              </p>
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

export default ViewPaymentModal;
