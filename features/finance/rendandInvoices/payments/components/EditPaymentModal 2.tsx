"use client";

import {
  Banknote,
  CreditCard,
  DollarSign,
  Edit,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

interface EditPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: Payment;
}

const EditPaymentModal = ({
  open,
  onClose,
  payment,
}: EditPaymentModalProps) => {
  const [formData, setFormData] = useState({
    paymentDate: new Date(payment.paymentDate),
    paymentMethod: payment.paymentMethod,
    amountPaid: payment.amountPaid,
    notes: payment.notes || "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (
    field: string,
    value: string | number | Date | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const updatedPayment = {
        ...payment,
        ...formData,
        updatedAt: new Date().toISOString(),
      };
      // In real implementation, this would make an API call

      onClose();
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Edit className="w-5 h-5" />
            Edit Payment - {payment.paymentNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Information */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="mb-3 font-semibold text-gray-900">
                Payment Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
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
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Payment Date
                  </Label>
                  <DatePicker
                    value={formData.paymentDate}
                    onChange={(date) => handleInputChange("paymentDate", date)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Payment Method
                  </Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) =>
                      handleInputChange("paymentMethod", value)
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex gap-2 items-center">
                          <Banknote className="w-4 h-4" />
                          Cash
                        </div>
                      </SelectItem>
                      <SelectItem value="bank_transfer">
                        <div className="flex gap-2 items-center">
                          <DollarSign className="w-4 h-4" />
                          Bank Transfer
                        </div>
                      </SelectItem>
                      <SelectItem value="online">
                        <div className="flex gap-2 items-center">
                          <CreditCard className="w-4 h-4" />
                          Online
                        </div>
                      </SelectItem>
                      <SelectItem value="evc_plus">
                        <div className="flex gap-2 items-center">
                          <Smartphone className="w-4 h-4" />
                          EVC+
                        </div>
                      </SelectItem>
                      <SelectItem value="mpesa">
                        <div className="flex gap-2 items-center">
                          <Smartphone className="w-4 h-4" />
                          M-Pesa
                        </div>
                      </SelectItem>
                      <SelectItem value="other">
                        <div className="flex gap-2 items-center">
                          <DollarSign className="w-4 h-4" />
                          Other
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Amount Paid
                </Label>
                <Input
                  type="number"
                  value={formData.amountPaid}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      handleInputChange("amountPaid", 0);
                    } else {
                      const parsed = parseFloat(value);
                      if (!isNaN(parsed) && parsed >= 0) {
                        handleInputChange("amountPaid", parsed);
                      }
                    }
                  }}
                  step="0.01"
                  min="0"
                  className="bg-white border-gray-200"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Notes
                </Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Optional notes about this payment..."
                  className="bg-white border-gray-200"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPaymentModal;
