"use client";

import { Mail, Receipt } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface SendReceiptModalProps {
  open: boolean;
  onClose: () => void;
  payment: Payment;
}

const SendReceiptModal = ({
  open,
  onClose,
  payment,
}: SendReceiptModalProps) => {
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

  const [formData, setFormData] = useState({
    recipientEmail: payment.tenant.email,
    ccEmail: "",
    subject: `Payment Receipt - ${payment.paymentNumber}`,
    message: `Dear ${payment.tenant.name},

        Thank you for your payment of {payment.amountPaid} for ${
          payment.property.unit
        } - ${payment.property.projectName}.

Payment Details:
- Payment Number: ${payment.paymentNumber}
- Payment Date: ${new Date(payment.paymentDate).toLocaleDateString()}
- Payment Method: ${getMethodLabel(payment.paymentMethod)}
        - Amount Paid: {payment.amountPaid}

Please find your receipt attached to this email.

Best regards,
Your Property Management Team`,
    includeReceipt: true,
    includeInvoiceDetails: true,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const emailData = {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        ...formData,
        sentAt: new Date().toISOString(),
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
      <DialogContent className="max-w-2xl max-h-[calc(100vh-150px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Receipt - {payment.paymentNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* Email Configuration */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Email Configuration</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium text-gray-700 text-sm">
                  Recipient Email
                </Label>
                <Input
                  type="email"
                  value={formData.recipientEmail}
                  onChange={(e) =>
                    handleInputChange("recipientEmail", e.target.value)
                  }
                  className="bg-white border-gray-200"
                  placeholder="recipient@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium text-gray-700 text-sm">
                  CC Email (Optional)
                </Label>
                <Input
                  type="email"
                  value={formData.ccEmail}
                  onChange={(e) => handleInputChange("ccEmail", e.target.value)}
                  className="bg-white border-gray-200"
                  placeholder="cc@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium text-gray-700 text-sm">
                  Subject
                </Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  className="bg-white border-gray-200"
                  placeholder="Email subject"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium text-gray-700 text-sm">
                  Message
                </Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  className="bg-white border-gray-200"
                  rows={8}
                  placeholder="Email message"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeReceipt"
                    checked={formData.includeReceipt}
                    onCheckedChange={(checked) =>
                      handleInputChange("includeReceipt", checked as boolean)
                    }
                  />
                  <Label htmlFor="includeReceipt" className="text-sm">
                    Include payment receipt as attachment
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeInvoiceDetails"
                    checked={formData.includeInvoiceDetails}
                    onCheckedChange={(checked) =>
                      handleInputChange(
                        "includeInvoiceDetails",
                        checked as boolean
                      )
                    }
                  />
                  <Label htmlFor="includeInvoiceDetails" className="text-sm">
                    Include invoice details in email body
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Details Preview */}
          {formData.includeInvoiceDetails &&
            payment.invoicesApplied.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">
                  Invoice Details to Include
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    {payment.invoicesApplied.map((invoice) => (
                      <div key={invoice.id} className="text-blue-800 text-sm">
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
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !formData.recipientEmail}
            >
              {isLoading ? "Sending..." : "Send Receipt"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendReceiptModal;
