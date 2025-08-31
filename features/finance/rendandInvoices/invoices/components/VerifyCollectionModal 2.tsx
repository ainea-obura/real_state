"use client";

import { CheckCircle, User, Building, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InvoiceTableItem } from "@/features/finance/scehmas/invoice";
import { useState } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useMutation } from "@tanstack/react-query";
import { verifyPayment } from "@/actions/finance/payment";
import { toast } from "sonner";

interface VerifyCollectionModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceTableItem;
}

const VerifyCollectionModal = ({
  open,
  onClose,
  invoice,
}: VerifyCollectionModalProps) => {
  if (!invoice) return null;
  const [phone, setPhone] = useState(invoice.recipient.phone || "");

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    console.log("STATUS", status);
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      sent: { label: "Sent", className: "bg-blue-100 text-blue-800" },
      viewed: { label: "Viewed", className: "bg-purple-100 text-purple-800" },
      paid: { label: "Paid", className: "bg-green-100 text-green-800" },
      overdue: { label: "Overdue", className: "bg-red-100 text-red-800" },
      cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600" },
      partial: { label: "Partial", className: "bg-yellow-100 text-yellow-800" },
      issued: { label: "Issued", className: "bg-blue-50 text-blue-700" },
    };
    const config =
      statusConfig[status?.toLowerCase() as keyof typeof statusConfig] ||
      statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      return await verifyPayment({ invoice_id: invoice.id, phone_number: phone });
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message || "Failed to verify payment");
      } else {
        toast.success("Payment verification initiated successfully");
        onClose();
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to verify payment");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center text-xl font-bold">
            <BadgeCheck className="w-6 h-6 text-green-600" />
            Verify Collection
          </DialogTitle>
        </DialogHeader>
        <div className="pt-8 space-y-6">
          {/* Invoice summary */}
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div>
              <div className="text-xs text-gray-500">Invoice #</div>
              <div className="text-lg font-semibold">
                {invoice.invoiceNumber}
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <div className="flex gap-2 items-center">
                {getStatusBadge(invoice.status)}
              </div>
              <div className="flex gap-4 mt-1 text-xs text-gray-500">
                <span>
                  Issued:{" "}
                  <span className="font-medium text-gray-700">
                    {formatDate(invoice.issueDate)}
                  </span>
                </span>
                <span>
                  Due:{" "}
                  <span className="font-medium text-gray-700">
                    {formatDate(invoice.dueDate)}
                  </span>
                </span>
              </div>
            </div>
          </div>
          {/* Phone Input */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <PhoneInput
              country={"ke"}
              value={phone}
              onChange={setPhone}
              inputClass="w-full h-11"
              inputStyle={{ width: "100%", height: "44px" }}
              specialLabel=""
              enableSearch={true}
              searchPlaceholder="Search country"
            />
          </div>
          <div className="grid grid-cols-3 gap-4 p-4 text-center bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500">Items</div>
              <div className="text-2xl font-bold">{invoice.items.length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-2xl font-bold">{invoice.total}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Status</div>
              <div className="text-2xl font-bold capitalize">
                {invoice.status}
              </div>
            </div>
          </div>
          {/* Recipient and property info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex gap-2 items-center mb-1 text-sm font-semibold">
                <User className="w-4 h-4" /> Recipient
              </div>
              <div className="mb-1 text-xs text-gray-700">
                <span className="font-semibold">Name:</span>{" "}
                {invoice.recipient.name}
              </div>
              <div className="mb-1 text-xs text-gray-700">
                <span className="font-semibold">Email:</span>{" "}
                {invoice.recipient.email}
              </div>
              <div className="text-xs text-gray-700">
                <span className="font-semibold">Phone:</span>{" "}
                {invoice.recipient.phone || "-"}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex gap-2 items-center mb-1 text-sm font-semibold">
                <Building className="w-4 h-4" /> Property
              </div>
              <div className="text-xs text-gray-500">
                {invoice.property.unit}
              </div>
              <div className="text-xs text-gray-400">
                {invoice.property.projectName}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" size="lg" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={() => mutation.mutate()}
              disabled={!phone || mutation.status === 'pending'}
            >
              {mutation.status === 'pending' ? (
                <span className="flex items-center"><CheckCircle className="mr-2 w-5 h-5 animate-spin" />Verifying...</span>
              ) : (
                <span className="flex items-center"><CheckCircle className="mr-2 w-5 h-5" />Verify Collection</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerifyCollectionModal;
