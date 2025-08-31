"use client";

import { Download, Eye, Mail, MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendInvoice } from '@/actions/finance/invoice';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { InvoiceTableItem } from "@/features/finance/scehmas/invoice";

interface InvoiceItem {
  description: string;
  quantity: number;
  amount: number;
  price: number;
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

interface SendInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceTableItem;
  mode?: "send" | "resend"; // Add mode prop for dynamic behavior
}

const SendInvoiceModal = ({
  open,
  onClose,
  invoice,
  mode = "send", // Default to "send" mode
}: SendInvoiceModalProps) => {
  const [sendOptions, setSendOptions] = useState({
    email: true,
    sms: false,
    customMessage: "",
    includePaymentLink: true,
    sendCopy: false,
  });



  const queryClient = useQueryClient();

  const sendInvoiceMutation = useMutation({
    mutationFn: (customMessage: string) => sendInvoice(invoice.id, customMessage),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message || "Failed to send invoice");
      } else {
        toast.success(`${mode === "resend" ? "Resent" : "Sent"} invoice ${invoice.invoiceNumber} successfully`);
        queryClient.invalidateQueries({ queryKey: ["invoice-table"] });
        queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
        onClose();
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to send invoice");
    },
  });

  const handleSend = async () => {
    try {
      await sendInvoiceMutation.mutateAsync(sendOptions.customMessage);
    } catch (error) {
      console.error("Error sending invoice:", error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-3xl max-h-[calc(100vh-150px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Send className="w-5 h-5" />
            {mode === "resend" ? "Resend" : "Send"} Invoice - {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className="text-sm text-gray-600">Recipient</div>
                <div className="font-medium">{invoice.recipient.name}</div>
                <div className="text-sm text-gray-600">
                  {invoice.recipient.email}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Property</div>
                <div className="font-medium">{invoice.property.unit}</div>
                <div className="text-sm text-gray-600">
                  {invoice.property.projectName}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Amount</div>
                <div className="text-lg font-medium">{invoice.total}</div>
                <div className="text-sm text-gray-600">
                  Due: {formatDate(invoice.dueDate)}
                </div>
              </div>
            </div>
            {mode === "resend" && (
              <div className="p-2 mt-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="text-sm font-medium text-blue-800">
                  📧 This invoice was previously sent on {formatDate(invoice.issueDate)}
                </div>
                <div className="text-xs text-blue-600">
                  Resending will send a new copy to the recipient
                </div>
              </div>
            )}
          </div>

          {/* Send Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Send Options</h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={sendOptions.email}
                  disabled
                />
                <Label htmlFor="email" className="flex gap-2 items-center">
                  <Mail className="w-4 h-4" />
                  Send via Email
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sms"
                  checked={sendOptions.sms}
                  disabled
                />
                <Label htmlFor="sms" className="flex gap-2 items-center text-gray-400">
                  <MessageSquare className="w-4 h-4" />
                  Send via SMS (Coming Soon)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePaymentLink"
                  checked={sendOptions.includePaymentLink}
                  disabled
                />
                <Label htmlFor="includePaymentLink" className="text-gray-400">
                  Include Payment Link (Coming Soon)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendCopy"
                  checked={sendOptions.sendCopy}
                  disabled
                />
                <Label htmlFor="sendCopy" className="text-gray-400">
                  Send Copy to Property Manager (Coming Soon)
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Message (Optional)</Label>
              <Textarea
                id="customMessage"
                value={sendOptions.customMessage}
                onChange={(e) =>
                  setSendOptions((prev) => ({
                    ...prev,
                    customMessage: e.target.value,
                  }))
                }
                placeholder="Add a personal message to include with the invoice..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!sendOptions.email || sendInvoiceMutation.isPending}
              className={mode === "resend" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <Send className="mr-2 w-4 h-4" />
              {sendInvoiceMutation.isPending 
                ? "Sending..." 
                : `${mode === "resend" ? "Resend" : "Send"} Invoice`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendInvoiceModal;
