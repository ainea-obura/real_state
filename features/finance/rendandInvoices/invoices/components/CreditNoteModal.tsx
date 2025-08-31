"use client";

import { AlertTriangle, CreditCard, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createCreditNote } from '@/actions/finance/invoice';
import { PAYMENT_METHOD_CHOICES } from '@/features/finance/paymen-methods';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
  total_no_currency: number;
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

interface CreditNoteModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceTableItem;
}

const CreditNoteModal = ({ open, onClose, invoice }: CreditNoteModalProps) => {
  const [creditData, setCreditData] = useState({
    type: "refund",
    amount: invoice.total_no_currency,
    reason: "",
    description: "",
    applyToFuture: false,
    paymentType: "", // Mobile, Bank, Cash
    paymentMethod: "", // Specific method
    accountNumber: "",
  });

  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    setCreditData((prev) => ({ ...prev, [field]: value }));
  };

  // Group payment methods by type
  const mobileMethods = PAYMENT_METHOD_CHOICES.filter(method => method.type === "Mobile");
  const bankMethods = PAYMENT_METHOD_CHOICES.filter(method => method.type === "Bank");
  const cashMethods = PAYMENT_METHOD_CHOICES.filter(method => method.type === "Cash");

  // Get available payment methods based on selected type
  const getAvailablePaymentMethods = () => {
    switch (creditData.paymentType) {
      case "Mobile":
        return mobileMethods;
      case "Bank":
        return bankMethods;
      case "Cash":
        return cashMethods;
      default:
        return [];
    }
  };

  const availablePaymentMethods = getAvailablePaymentMethods();
  const isCashPayment = creditData.paymentType === "Cash";
  const isMobilePayment = creditData.paymentType === "Mobile";
  const isBankPayment = creditData.paymentType === "Bank";

  // Validation variables
  const requiresAccountNumber = !isCashPayment;
  const hasValidAccountNumber = isCashPayment || creditData.accountNumber;
  const hasValidPaymentMethod = isCashPayment || creditData.paymentMethod;

  const createCreditNoteMutation = useMutation({
    mutationFn: createCreditNote,
    onSuccess: (result) => {
      console.log("API Response:", result); // Debug log
      
      if (result.error === false) {
        toast.success("Credit note created successfully!");
        onClose();
        // Reset form
        setCreditData({
          type: "refund",
          amount: invoice.total_no_currency,
          reason: "",
          description: "",
          applyToFuture: false,
          paymentType: "",
          paymentMethod: "",
          accountNumber: "",
        });
        // You might want to refresh the invoice data here
      } else {
        console.log("API returned error:", result);
        toast.error(result.message || "Failed to create credit note");
        // Don't close modal on error
      }
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast.error(error?.message || "Failed to create credit note");
      // Don't close modal on error
    },
  });

  const handleSubmit = () => {
    console.log("Submit clicked with data:", {
      invoice_id: invoice.id,
      amount: creditData.amount,
      reason: creditData.reason,
      description: creditData.description,
      paymentMethod: creditData.paymentMethod,
      accountNumber: creditData.accountNumber,
    });

    if (!creditData.reason || creditData.amount <= 0 || creditData.amount > invoice.total_no_currency || !creditData.paymentType || !hasValidPaymentMethod || (requiresAccountNumber && !hasValidAccountNumber)) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    const mutationData = {
      invoice_id: invoice.id,
      amount: creditData.amount,
      reason: creditData.reason,
      description: creditData.description,
      paymentMethod: creditData.paymentMethod,
      accountNumber: isCashPayment ? "" : creditData.accountNumber, // Send empty string for cash
    };

    console.log("Calling mutation with:", mutationData);
    createCreditNoteMutation.mutate(mutationData);
  };

  const getCreditTypeLabel = (type: string) => {
    const typeLabels = {
      refund: "Refund",
      adjustment: "Adjustment",
      discount: "Discount",
      writeoff: "Write-off",
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-3xl max-h-[calc(100vh-200px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <CreditCard className="w-5 h-5" />
            Create Credit Note - {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Invoice Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="mb-2 font-semibold">Original Invoice</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Invoice Number</div>
                <div className="font-medium">{invoice.invoiceNumber}</div>
              </div>
              <div>
                <div className="text-gray-600">Original Amount</div>
                <div className="font-medium">{invoice.total_no_currency}</div>
              </div>
              <div>
                <div className="text-gray-600">Recipient</div>
                <div className="font-medium">{invoice.recipient.name}</div>
              </div>
              <div>
                <div className="text-gray-600">Property</div>
                <div className="font-medium">{invoice.property.unit}</div>
              </div>
            </div>
          </div>

          {/* Credit Note Details */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Credit Note Details</h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {/* Payment Type Selection */}
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select
                  value={creditData.paymentType}
                  onValueChange={(value) => {
                    handleInputChange("paymentType", value);
                    // Clear payment method and account number when payment type changes
                    if (value === "Cash") {
                      // For Cash, automatically set payment method to "cash"
                      handleInputChange("paymentMethod", "cash");
                    } else {
                      handleInputChange("paymentMethod", "");
                    }
                    handleInputChange("accountNumber", "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method Selection - Only show if payment type is selected and not Cash */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                {creditData.paymentType && creditData.paymentType !== "Cash" ? (
                  <Select
                    value={creditData.paymentMethod}
                    onValueChange={(value) => {
                      handleInputChange("paymentMethod", value);
                      // Clear account number when payment method changes
                      handleInputChange("accountNumber", "");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Select ${creditData.paymentType.toLowerCase()} method`} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePaymentMethods.map((method) => (
                        <SelectItem key={method.code} value={method.code}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center px-3 py-2 w-full h-10 text-sm text-gray-500 bg-gray-100 rounded-md border border-gray-200">
                    {creditData.paymentType === "Cash" ? "Cash" : "Select payment type first"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Credit Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={creditData.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      handleInputChange("amount", 0);
                    } else {
                      const parsed = parseFloat(value);
                      if (!isNaN(parsed) && parsed >= 0) {
                        handleInputChange("amount", parsed);
                      }
                    }
                  }}
                  step="0.01"
                  min="0"
                  max={invoice.total_no_currency}
                  className="w-full"
                />
                <div className="text-xs text-gray-600">
                  Max: {invoice.total_no_currency}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select
                  value={creditData.reason}
                  onValueChange={(value) => handleInputChange("reason", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overpayment">Overpayment</SelectItem>
                    <SelectItem value="service_issue">Service Issue</SelectItem>
                    <SelectItem value="billing_error">Billing Error</SelectItem>
                    <SelectItem value="tenant_request">Tenant Request</SelectItem>
                    <SelectItem value="promotional">
                      Promotional Credit
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Account Number/Phone Number - Only show if not cash and payment method selected */}
            {!isCashPayment && creditData.paymentMethod && (
              <div className="space-y-2">
                <Label htmlFor="accountNumber">
                  {isMobilePayment
                    ? "Phone Number" 
                    : isBankPayment
                    ? "Account Number"
                    : "Account/Phone Number"
                  }
                </Label>
                <Input
                  id="accountNumber"
                  type="text"
                  value={creditData.accountNumber}
                  onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                  placeholder={
                    isMobilePayment
                      ? "Enter phone number (e.g., 254700000000)"
                      : isBankPayment
                      ? "Enter account number"
                      : "Enter account or phone number"
                  }
                  className="w-full"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={creditData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Provide detailed explanation for the credit..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="applyToFuture"
                checked={creditData.applyToFuture}
                onCheckedChange={(checked) =>
                  handleInputChange("applyToFuture", checked)
                }
              />
              <Label htmlFor="applyToFuture">
                Apply credit to future invoices
              </Label>
            </div>
          </div>

          {/* Credit Summary */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <h3 className="flex gap-2 items-center mb-2 font-semibold">
              <DollarSign className="w-4 h-4" />
              Credit Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Original Invoice Amount:</span>
                <span>{invoice.total_no_currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Credit Amount:</span>
                <span className="font-medium text-red-600">
                  -{creditData.amount}
                </span>
              </div>
              <div className="flex justify-between pt-2 font-semibold border-t">
                <span>Remaining Balance:</span>
                <span>{Math.max(0, invoice.total_no_currency - creditData.amount)}</span>
              </div>
            </div>
          </div>

          {/* Warning */}
          {creditData.amount > invoice.total_no_currency * 0.5 && (
            <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex gap-2 items-center text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Large Credit Warning</span>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                This credit represents more than 50% of the original invoice
                amount. Please ensure this is correct.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createCreditNoteMutation.isPending ||
                !creditData.reason ||
                creditData.amount <= 0 ||
                creditData.amount > invoice.total_no_currency ||
                !creditData.paymentType ||
                !hasValidPaymentMethod ||
                (requiresAccountNumber && !hasValidAccountNumber)
              }
            >
              <CreditCard className="mr-2 w-4 h-4" />
              {createCreditNoteMutation.isPending ? "Processing..." : "Create Credit Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreditNoteModal;
