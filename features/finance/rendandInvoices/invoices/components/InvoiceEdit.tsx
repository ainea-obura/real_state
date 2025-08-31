"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Building, DollarSign, Edit, Plus, Trash2, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";

import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrencyDropdown } from '@/actions/projects/index';
import TenantItemsTab from "./TenantItemsTab";
import { invoiceDraftsAtom } from "@/store/nvoiceDrafts";
import { updateInvoice } from "@/actions/finance/invoice";

interface InvoiceEditProps {
  invoice: any;
  onSuccess: () => void;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  type: "Fixed" | "Variable" | "DEPOSIT" | "PENALTY" | "PERCENTAGE";
  percentage_rate?: number;
}

const InvoiceEdit = ({ invoice, onSuccess }: InvoiceEditProps) => {
  const [isLoading, setIsLoading] = useState(false);
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
    taxPercentage: 0,
    discountPercentage: 0,
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [drafts, setDrafts] = useAtom(invoiceDraftsAtom);
  const [summaryTotals, setSummaryTotals] = useState({
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
  });

  // Fetch default currency using useQuery
  const { data: currencies, isLoading: currencyLoading } = useQuery({
    queryKey: ["currency-dropdown"],
    queryFn: async () => {
      const response = await getCurrencyDropdown();
      return response;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const defaultCurrency = currencies && currencies.length > 0
    ? { code: currencies[0].code, symbol: currencies[0].symbol }
    : { code: "KES", symbol: "KES" };

  useEffect(() => {
    if (invoice) {
      console.log("Invoice object:", invoice);
      console.log("Discount fields:", {
        discount: invoice.discount,
        discount_percentage: invoice.discount_percentage,
        discount_amount: invoice.discount_amount
      });
      const formDataToSet = {
        recipientType: invoice.recipient?.type || "tenant",
        recipientName: invoice.recipient?.name || "",
        recipientEmail: invoice.recipient?.email || "",
        recipientPhone: invoice.recipient?.phone || "",
        propertyUnit: invoice.property?.unit || "",
        projectName: invoice.property?.projectName || "",
        dueDate: invoice.dueDate || "",
        issueDate: invoice.issueDate || "",
        notes: invoice.notes || "",
        isRecurring: !!invoice.recurring,
        recurringFrequency: invoice.recurring?.frequency || "monthly",
        recurringEndDate: invoice.recurring?.endDate || "",
        taxPercentage: invoice.tax_percentage || 0,
        discountPercentage: invoice.discount || 0,
      };
      
      console.log("Setting form data:", formDataToSet);
      setFormData(formDataToSet);
      
      // Convert invoice items to draft format for TenantItemsTab
      const convertedItems = (invoice.items || []).map((item: any) => ({
        ...item,
        type: item.type.toUpperCase(),
        node_name: invoice.property?.unit || "",
        quantity: item.quantity || 1,
        amount: item.amount || 0,
        price: item.price || (item.amount || 0) * (item.quantity || 1),
      }));

      // Create draft structure for TenantItemsTab
      const draft = {
        id: invoice.recipient?.id || invoice.id,
        type: invoice.recipient?.type || "tenant",
        name: invoice.recipient?.name || "",
        units: [{
          unitId: invoice.property?.unit || "",
          unitName: invoice.property?.unit || "",
          items: convertedItems,
        }],
      };


      // Set draft in atom
      setDrafts([draft]);
      setItems(convertedItems);
    }
  }, [invoice, setDrafts]);

  const handleInputChange = (
    field: string,
    value: string | boolean | number
  ) => {
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
    // Get items from drafts (TenantItemsTab data)
    const allItems = drafts.flatMap(draft => 
      draft.units?.flatMap(unit => unit.items) || []
    );
    return allItems.reduce((sum, item) => {
      // For variable items, use the price directly, otherwise use amount * quantity
      const itemTotal = item.type === "VARIABLE" 
        ? Number(item.price) || 0
        : (Number(item.amount) || 0) * (Number(item.quantity) || 1);
      return sum + itemTotal;
    }, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * ((Number(formData.taxPercentage) || 0) / 100);
  };

  const calculateDiscount = () => {
    // Use absolute discount value from form data, ensure it's a number
    return Number(formData.discountPercentage) || 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount() + calculateTax();
  };

  // Recalculate totals when drafts or form data changes
  useEffect(() => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const discount = calculateDiscount();
    const total = calculateTotal();

    setSummaryTotals({
      subtotal,
      tax,
      discount,
      total,
    });
  }, [drafts, formData.taxPercentage, formData.discountPercentage]);

  const handleSubmit = async (e: React.FormEvent, type: "draft" | "issued" = "issued") => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get updated items from drafts (TenantItemsTab data)
      const allItems = drafts.flatMap(draft => 
        draft.units?.flatMap(unit => unit.items) || []
      );

      // Get original invoice items to match IDs
      const originalItems = invoice.items || [];      
      // Create a map of original items by description for ID matching
      const originalItemsMap = new Map();
      originalItems.forEach((item: any) => {
        originalItemsMap.set(item.description, item);
      });

      // Prepare payload with updated amounts/quantities but original IDs
      const payload = {
        items: allItems.map((item: any) => {
          const originalItem = originalItemsMap.get(item.description);
          return {
            id: originalItem?.id || item.id,
            amount: item.amount,
            quantity: item.quantity,
          };
        }),
        type,
        tax_percentage: formData.taxPercentage,
        discount: formData.discountPercentage,
        notes: formData.notes,
        due_date: formData.dueDate,
        issue_date: formData.issueDate,
      };

      // Call updateInvoice action
      const response = await updateInvoice(invoice.id, payload);
      
      if (response.error) {
        toast.error(response.message || "Failed to update invoice");
      } else {
        const message = type === "draft" 
          ? "Invoice saved as draft successfully" 
          : "Invoice issued successfully";
        toast.success(message);
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to update invoice");
    } finally {
      setIsLoading(false);
    }
  };

  if (!invoice) {
    return <div>No invoice selected for editing</div>;
  }

  console.log("Current formData:", formData);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="space-y-6">
        {/* Recipient and Property Information */}
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Recipient Information */}
          <div className="flex-1 p-4 pb-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
            <div className="flex gap-2 items-center mb-3">
              <span className="mr-1 w-1 h-6 bg-primary" />
              <User className="w-5 h-5 text-primary" />
              <span className="text-base font-semibold text-gray-700">
                Recipient Information
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex gap-2 items-center text-xs text-gray-500">
                <span className="w-20 font-medium text-gray-600">Name:</span>
                <span className="font-medium text-gray-800 truncate">
                  {formData.recipientName}
                </span>
              </div>
              <div className="flex gap-2 items-center text-xs text-gray-500">
                <span className="w-20 font-medium text-gray-600">Email:</span>
                <span className="font-medium text-gray-800 truncate">
                  {formData.recipientEmail}
                </span>
              </div>
              <div className="flex gap-2 items-center text-xs text-gray-500">
                <span className="w-20 font-medium text-gray-600">Number:</span>
                <span className="font-medium text-gray-800 truncate">
                  {formData.recipientPhone}
                </span>
              </div>
              <div className="flex gap-2 items-center text-xs text-gray-500">
                <span className="w-20 font-medium text-gray-600">Type:</span>
                <span className="font-medium text-gray-800 capitalize truncate">
                  {formData.recipientType}
                </span>
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="flex-1 p-4 pt-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
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

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <DollarSign className="w-5 h-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Issue Date
                </Label>
                <Input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) =>
                    handleInputChange("issueDate", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Due Date
                </Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Tax Percentage (%)
                </Label>
                <Input
                  type="number"
                  value={formData.taxPercentage}
                  onChange={(e) =>
                    handleInputChange("taxPercentage", Number(e.target.value))
                  }
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Discount Amount
                </Label>
                <Input
                  type="number"
                  value={formData.discountPercentage}
                  onChange={(e) =>
                    handleInputChange(
                      "discountPercentage",
                      Number(e.target.value)
                    )
                  }
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <Plus className="w-5 h-5" />
              Invoice Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Recipient Header */}
            <div className="flex gap-3 items-center pb-4 mb-4 border-b border-gray-200">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900">
                  {formData.recipientName}
                </h4>
                <p className="text-sm text-gray-600">
                  {formData.recipientType} • {formData.recipientEmail}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {formData.recipientType}
              </Badge>
            </div>

            {/* Use TenantItemsTab component */}
            <TenantItemsTab
              tenant={{
                id: invoice.recipient?.id || invoice.id,
                name: formData.recipientName,
                email: formData.recipientEmail,
                type: formData.recipientType,
              }}
              step="items"
              currency={defaultCurrency}
            />

            {/* Summary */}
            <div className="p-4 mt-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm font-medium">
                    {defaultCurrency.symbol} {(summaryTotals.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Discount:
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    - {defaultCurrency.symbol} {(summaryTotals.discount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Tax ({formData.taxPercentage || 0}%):
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    + {defaultCurrency.symbol} {(summaryTotals.tax || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-lg font-bold">
                    {defaultCurrency.symbol} {(summaryTotals.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => onSuccess()}>
            Cancel
          </Button>
          <Button
            variant="ghost"
            onClick={(e) => handleSubmit(e, "draft")}
            className="text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-300"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save as Draft"}
          </Button>
          <Button onClick={(e) => handleSubmit(e, "issued")} disabled={isLoading}>
            {isLoading ? "Issuing..." : "Issue Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEdit;
