"use client";

import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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

interface CancelPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: Payment;
}

const CancelPaymentModal = ({
  open,
  onClose,
  payment,
}: CancelPaymentModalProps) => {
  const [formData, setFormData] = useState({
    cancelReason: "",
    notes: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const cancelData = {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        ...formData,
        cancelledAt: new Date().toISOString(),
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
            <X className="w-5 h-5" />
            Cancel Payment - {payment.paymentNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Alert */}
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              This action will cancel the pending payment and release any held
              funds. This action cannot be undone.
            </AlertDescription>
          </Alert>

          {/* Payment Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="mb-3 font-semibold text-gray-900">
              Payment Information
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
                <span className="text-gray-600">Payment Method:</span>
                <p className="font-medium">
                  {getMethodLabel(payment.paymentMethod)}
                </p>
              </div>
            </div>
          </div>

          {/* Cancel Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">
              Cancellation Details
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium text-gray-700 text-sm">
                  Cancellation Reason
                </Label>
                <Select
                  value={formData.cancelReason}
                  onValueChange={(value) =>
                    handleInputChange("cancelReason", value)
                  }
                >
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_request">
                      Tenant Request
                    </SelectItem>
                    <SelectItem value="payment_timeout">
                      Payment Timeout
                    </SelectItem>
                    <SelectItem value="insufficient_funds">
                      Insufficient Funds
                    </SelectItem>
                    <SelectItem value="system_error">System Error</SelectItem>
                    <SelectItem value="duplicate_payment">
                      Duplicate Payment
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-medium text-gray-700 text-sm">
                  Additional Notes
                </Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Optional notes about this cancellation..."
                  className="bg-white border-gray-200"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !formData.cancelReason}
              variant="destructive"
            >
              {isLoading ? "Cancelling..." : "Cancel Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelPaymentModal;
