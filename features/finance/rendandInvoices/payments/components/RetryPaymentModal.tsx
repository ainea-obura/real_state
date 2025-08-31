"use client";

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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

interface RetryPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: Payment;
}

const RetryPaymentModal = ({
  open,
  onClose,
  payment,
}: RetryPaymentModalProps) => {
  const [formData, setFormData] = useState({
    retryMethod: payment.paymentMethod,
    notes: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const retryData = {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        originalMethod: payment.paymentMethod,
        ...formData,
        retriedAt: new Date().toISOString(),
      };

      
      // In real implementation, this would make an API call

      onClose();
    } catch (error) {
      
    } finally {
      setIsLoading(false);
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Retry Payment - {payment.paymentNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="mb-3 font-semibold text-gray-900">
              Failed Payment Information
            </h3>
            <div className="gap-4 grid grid-cols-2 text-sm">
              <div>
                <span className="text-gray-600">Tenant:</span>
                <p className="font-medium">{payment.tenant.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Property:</span>
                <p className="font-medium">
                  {payment.property.unit} - {payment.property.projectName}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Amount:</span>
                <p className="font-medium">{payment.amountPaid}</p>
              </div>
              <div>
                <span className="text-gray-600">Original Method:</span>
                <p className="font-medium">
                  {getMethodLabel(payment.paymentMethod)}
                </p>
              </div>
            </div>
          </div>

          {/* Retry Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Retry Configuration</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium text-gray-700 text-sm">
                  Payment Method
                </Label>
                <Select
                  value={formData.retryMethod}
                  onValueChange={(value) =>
                    handleInputChange("retryMethod", value)
                  }
                >
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="evc_plus">EVC+</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-gray-500 text-xs">
                  You can change the payment method for the retry attempt
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium text-gray-700 text-sm">
                  Retry Notes
                </Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Optional notes about this retry attempt..."
                  className="bg-white border-gray-200"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Invoices to Apply */}
          {payment.invoicesApplied.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                Invoices to Apply ({payment.invoicesApplied.length})
              </h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 text-sm">
                  The same invoices will be applied to this retry attempt:
                </p>
                <div className="space-y-1 mt-2">
                  {payment.invoicesApplied.map((invoice) => (
                    <div key={invoice.id} className="text-blue-700 text-sm">
                      • {invoice.invoiceNumber} - {invoice.amount}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Retrying..." : "Retry Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RetryPaymentModal;
