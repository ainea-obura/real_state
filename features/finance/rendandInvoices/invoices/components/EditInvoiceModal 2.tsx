"use client";

import {
  Building,
  Calendar,
  DollarSign,
  Edit,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { InvoiceTableItem } from "@/features/finance/scehmas/invoice";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateInvoice } from "@/actions/finance/invoice";
import { toast } from "sonner";
import { deleteInvoice } from "@/actions/finance/invoice";
import { ConfirmationDialog } from './confirmation-dialog';

// Define the type locally for type narrowing
interface UpdateInvoiceItem {
  id: string;
  amount: number;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  type: "Fixed" | "Variable"; // Added type for variable items
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

interface EditInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceTableItem;
}

const EditInvoiceModal = ({
  open,
  onClose,
  invoice,
}: EditInvoiceModalProps) => {
  // Step state
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    recipientType: "tenant",
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    propertyUnit: "",
    projectName: "",
    dueDate: "",
    issueDate: "",
    notes: "",
    isRecurring: false,
    recurringFrequency: "monthly",
    recurringEndDate: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (invoice) {
      setFormData({
        recipientType: invoice.recipient.type,
        recipientName: invoice.recipient.name,
        recipientEmail: invoice.recipient.email,
        recipientPhone: invoice.recipient.phone,
        propertyUnit: invoice.property.unit,
        projectName: invoice.property.projectName,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate,
        notes: invoice.notes || "",
        isRecurring: !!invoice.recurring,
        recurringFrequency: invoice.recurring?.frequency || "monthly",
        recurringEndDate: invoice.recurring?.endDate || "",
      });
      // Ensure each item has a 'type' property
      setItems(
        invoice.items.map((item: any) => ({
          ...item,
          type:
            item.type ||
            (item.description?.toLowerCase().includes("variable")
              ? "Variable"
              : "Fixed"),
        }))
      );
    }
  }, [invoice]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    // Calculate amount
    if (field === "quantity" || field === "rate") {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    setItems(newItems);
  };

  // Only allow editing amount for Variable items
  const handleVariableAmountChange = (index: number, value: number) => {
    const newItems = [...items];
    newItems[index].amount = value;
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };
  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax rate
  };
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const queryClient = useQueryClient();
  // Mutation for updating invoice
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ type }: { type: "draft" | "issued" }) => {
      // Prepare payload: only variable items, only id and amount
      const variableItems = items
        .map((item: any) =>
          item.type === "Variable" && item.id
            ? { id: item.id, amount: item.amount }
            : null
        )
        .filter((x): x is UpdateInvoiceItem => Boolean(x));
      const payload = {
        items: variableItems,
        type,
      };
      return updateInvoice(invoice.id, payload);
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
      }
      toast.success(data.message);
      // Invalidate queries to refetch invoice table and stats
      queryClient.invalidateQueries({ queryKey: ["invoice-table"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      onClose();
    },
    onError: (error) => {
      toast.success(error.message || "Failed to update invoice");
    },
  });
  const deleteInvoiceMutation = useMutation({
    mutationFn: async () => deleteInvoice(invoice.id),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["invoice-table"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      setConfirmDeleteOpen(false);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete invoice");
    },
  });

  const handleSubmit = async () => {
    // Mock API call for now
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="overflow-y-auto min-w-[1000px]">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Edit className="w-5 h-5" />
            Edit Invoice - {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Stepper */}
          <div className="flex relative justify-center items-center mb-6">
            {/* Progress line */}
            <div className="absolute left-1/2 top-1/2 w-2/3 h-0.5 bg-gray-200 -translate-x-1/2 z-0" />
            {/* Step 1 */}
            <div className="flex relative z-10 flex-col items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step === 1
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-400 border-gray-300"
                }`}
              >
                {1}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  step === 1 ? "text-primary" : "text-gray-400"
                }`}
              >
                Info
              </span>
            </div>
            {/* Spacer for line */}
            <div className="flex-1" />
            {/* Step 2 */}
            <div className="flex relative z-10 flex-col items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step === 2
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-400 border-gray-300"
                }`}
              >
                {2}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  step === 2 ? "text-primary" : "text-gray-400"
                }`}
              >
                Items
              </span>
            </div>
          </div>
          {/* Delete button on step 1 */}
          {step === 1 && (
            <>
              <button
                className="flex absolute top-6 right-8 gap-1 items-center text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={invoice.status == "Draft"}
              >
                <Trash2 className="w-4 h-4" /> Delete Invoice
              </button>
              <ConfirmationDialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={() => deleteInvoiceMutation.mutate()}
                title="Delete Invoice"
                invoiceNumber={invoice.invoiceNumber}
                loading={deleteInvoiceMutation.isPending}
              />
            </>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-6 md:flex-row">
              {/* Recipient Information */}
              <div className="flex-1 p-4 pb-3 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex gap-2 items-center mb-3">
                  <span className="mr-1 w-1 h-6 bg-primary" />
                  <User className="w-5 h-5 text-primary" />
                  <span className="text-base font-semibold text-gray-700">
                    Recipient Information
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2 items-center text-xs text-gray-500">
                    <span className="w-20 font-medium text-gray-600">
                      Name:
                    </span>
                    <span className="font-medium text-gray-800 truncate">
                      {formData.recipientName}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center text-xs text-gray-500">
                    <span className="w-20 font-medium text-gray-600">
                      Email:
                    </span>
                    <span className="font-medium text-gray-800 truncate">
                      {formData.recipientEmail}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center text-xs text-gray-500">
                    <span className="w-20 font-medium text-gray-600">
                      Number:
                    </span>
                    <span className="font-medium text-gray-800 truncate">
                      {formData.recipientPhone}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center text-xs text-gray-500">
                    <span className="w-20 font-medium text-gray-600">
                      Type:
                    </span>
                    <span className="font-medium text-gray-800 capitalize truncate">
                      {formData.recipientType}
                    </span>
                  </div>
                </div>
              </div>
              {/* Property Information */}
              <div className="flex-1 p-4 pt-3 bg-gradient-to-r from-blue-50 to-blue-100">
                <div className="flex gap-2 items-center mb-3">
                  <span className="mr-1 w-1 h-6 bg-blue-500" />
                  <Building className="w-5 h-5 text-blue-500" />
                  <h3 className="text-base font-bold tracking-tight text-blue-900">
                    Property Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-y-3 gap-x-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <div className="text-[10px] font-semibold text-blue-500 uppercase mb-0.5 tracking-wider">
                      Unit
                    </div>
                    <div className="text-sm font-medium text-blue-900">
                      {formData.propertyUnit}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-blue-500 uppercase mb-0.5 tracking-wider">
                      Project Name
                    </div>
                    <div className="text-sm font-medium text-blue-900">
                      {formData.projectName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              {/* Table Header */}
              <div className="grid grid-cols-5 bg-gray-50 border-b border-gray-200">
                <div className="p-3 text-sm font-medium text-gray-700 border-r border-gray-200">
                  Description
                </div>
                <div className="p-3 text-sm font-medium text-gray-700 border-r border-gray-200">
                  Unit
                </div>
                <div className="p-3 text-sm font-medium text-left text-gray-700 border-r border-gray-200">
                  Type
                </div>
                <div className="p-3 text-sm font-medium text-right text-gray-700 border-r border-gray-200">
                  Value
                </div>
                <div className="p-3 text-sm font-medium text-right text-gray-700">
                  Amount
                </div>
              </div>
              {/* Table Rows Grouped by Unit */}
              <div className="bg-white">
                {/* Group items by propertyUnit (since EditInvoiceModal only has one unit, but keep structure for future-proofing) */}
                <div className="mb-2">
                  {/* Unit Header */}
                  <div className="px-3 py-2 font-semibold text-blue-800 bg-blue-50 border-b border-blue-100">
                    {formData.propertyUnit}
                  </div>
                  {/* Items for this unit */}
                  {items.map((item, idx) => {
                    const isVariable = item.type === "Variable";
                    const isFixed = item.type === "Fixed";
                    const priceValue = isVariable
                      ? item.amount?.toString() ?? ""
                      : "";
                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-5 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="p-0 border-r border-gray-100">
                          <Input
                            value={item.description}
                            className="px-3 w-full h-12 rounded-none border-0 focus:border-0 focus:ring-0"
                            disabled
                          />
                        </div>
                        <div className="flex items-center p-0 px-3 text-xs text-gray-700 border-r border-gray-100">
                          {formData.propertyUnit}
                        </div>
                        <div className="flex items-center p-0 px-3 text-xs text-gray-700 border-r border-gray-100">
                          {item.type
                            .replace("_", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </div>
                        {/* Value column logic */}
                        <div className="flex justify-end items-center p-0 px-3 text-right border-r border-gray-100">
                          {isVariable ? (
                            <Input
                              type="number"
                              value={priceValue}
                              className="m-2 w-full h-full text-xs text-right rounded-sm border-gray-300 border-1 focus:ring-0"
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  const newItems = [...items];
                                  newItems[idx].amount = 0;
                                  setItems(newItems);
                                } else {
                                  const parsed = parseFloat(value);
                                  if (!isNaN(parsed) && parsed >= 0) {
                                    const newItems = [...items];
                                    newItems[idx].amount = parsed;
                                    setItems(newItems);
                                  }
                                }
                              }}
                            />
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                        {/* Amount column logic */}
                        <div className="flex justify-end items-center px-3 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            ${" "}
                            {isVariable ? priceValue || 0 : item.amount ?? "-"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Unit total */}
                  <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border-t border-gray-200">
                    <span className="font-medium text-gray-700">
                      Total for{" "}
                      <span className="text-blue-700">
                        {formData.propertyUnit}
                      </span>
                      :
                    </span>
                    <span className="font-bold text-blue-900">
                      {"$ " +
                        items
                          .reduce(
                            (sum, item) => sum + (Number(item.amount) || 0),
                            0
                          )
                          .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            {step === 2 && (
              <Button
                variant="ghost"
                size="icon"
                title="Save as Draft"
                className="text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-300"
                onClick={() => updateInvoiceMutation.mutate({ type: "draft" })}
              >
                <Edit className="w-5 h-5" />
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={() => updateInvoiceMutation.mutate({ type: "issued" })}
              >
                Update Invoice
              </Button>
            )}
            {step === 1 && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            {step === 1 && <Button onClick={() => setStep(2)}>Next</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditInvoiceModal;
