"use client";

import {
  DollarSign,
  Plus,
  Search,
  Trash2,
  Save,
  ArrowLeft,
  Calendar,
  Repeat,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { invoiceDraftsAtom } from "@/store/nvoiceDrafts";
import { createInvoice } from "@/actions/finance/invoice";
import { useMutation } from "@tanstack/react-query";
import { getCurrencyDropdown } from '@/actions/projects/index';
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecipientSearch } from "@/hooks/finance/useRecipientSearch";
import type {
  Recipient,
  SubmitInvoicePayload,
} from "@/features/finance/scehmas/invoice";
import TenantItemsTab from "./TenantItemsTab";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Zod validation schema for invoice form
const InvoiceFormSchema = z.object({
  recipientType: z.enum(["tenant", "owner"]),
  dueDate: z.date().optional(),
  issueDate: z.string({
    required_error: "Issue date is required",
  }).min(1, "Issue date is required"),
  notes: z.string().optional(),
  taxPercentage: z.number().min(0).max(100),
  discountPercentage: z.number().min(0).max(100),
  selectedRecipients: z.array(z.string()).min(1, "At least one recipient is required"),
  selectedRecipientObjects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    type: z.enum(["tenant", "owner"]),
    rented_units: z.array(z.any()),
    owned_nodes: z.array(z.any()),
  })).min(1, "At least one recipient is required"),
});

type InvoiceFormData = z.infer<typeof InvoiceFormSchema>;

interface InvoiceCreateProps {
  onSuccess: () => void;
}

const InvoiceCreate = ({ onSuccess }: InvoiceCreateProps) => {
  // React Hook Form setup
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(InvoiceFormSchema),
    defaultValues: {
      recipientType: "tenant",
      dueDate: undefined,
      issueDate: new Date().toISOString().split("T")[0],
      notes: "",
      taxPercentage: 0,
      discountPercentage: 0,
      selectedRecipients: [],
      selectedRecipientObjects: [],
    },
    mode: "onChange",
  });

  const { watch, setValue, formState: { errors, isValid, isDirty } } = form;
  const formData = watch();

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

  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    recipients,
    loading: recipientsLoading,
    error: recipientsError,
    search,
  } = useRecipientSearch(formData.recipientType, searchQuery);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showProjectSearchResults, setShowProjectSearchResults] = useState(false);
  const [showUnitSearchResults, setShowUnitSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const projectSearchRef = useRef<HTMLDivElement>(null);
  const unitSearchRef = useRef<HTMLDivElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const queryClient = useQueryClient();
  const [drafts] = useAtom(invoiceDraftsAtom);
  const [summaryTotals, setSummaryTotals] = useState({
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
  });

  // State to track selected items for each recipient
  const [selectedItemsByRecipient, setSelectedItemsByRecipient] = useState<Record<string, Set<string>>>({});

  // Calculation functions
  const calculateSubtotal = (items: any[]) =>
    items.reduce((sum, item) => {
      // For variable items, use the price directly, otherwise use amount * quantity
      const itemTotal = item.type === "VARIABLE" 
        ? Number(item.price) || 0
        : Number(item.amount) * Number(item.quantity) || 0;
      return sum + itemTotal;
    }, 0);
  
  const calculateTax = (items: any[]) =>
    calculateSubtotal(items) * (formData.taxPercentage / 100);
  
  const calculateDiscount = (items: any[]) =>
    calculateSubtotal(items) * (formData.discountPercentage / 100);
  
  const calculateTotal = (items: any[]) =>
    calculateSubtotal(items) - calculateDiscount(items) + calculateTax(items);

  // Recalculate totals when drafts or form data changes
  useEffect(() => {
    const allItems = drafts.flatMap(d => {
      const selectedItems = selectedItemsByRecipient[d.id] || new Set();
      return d.units?.flatMap(u => {
        const unitItems = u.items || [];
        return unitItems.filter((item: any) => {
          const key = `${u.unitId || ""}_${item.serviceId || item.description}`;
          return selectedItems.has(key);
        });
      }) || [];
    });
    
    const subtotal = calculateSubtotal(allItems);
    const tax = calculateTax(allItems);
    const discount = calculateDiscount(allItems);
    const total = calculateTotal(allItems);

    setSummaryTotals({
      subtotal,
      tax,
      discount,
      total,
    });
  }, [drafts, formData.taxPercentage, formData.discountPercentage, selectedItemsByRecipient]);

  // Helper function to get project summary
  const getProjectSummary = (recipient: Recipient) => {
    if (recipient.type === "tenant" && recipient.rented_units.length > 0) {
      const projectCounts: Record<string, number> = {};
      recipient.rented_units.forEach((unit) => {
        const parts = unit.name.split(" -> ");
        const project = parts[0] || "Unknown Project";
        projectCounts[project] = (projectCounts[project] || 0) + 1;
      });
      return Object.entries(projectCounts).map(([project, count]) => (
        <div key={project} className="flex gap-2 items-center text-sm text-blue-800">
          <span className="font-medium">{project}</span>
          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-800 rounded-full">
            {count} unit{count > 1 ? "s" : ""}
          </span>
        </div>
      ));
    } else if (recipient.type === "owner" && recipient.owned_nodes.length > 0) {
      const projectCounts: Record<string, number> = {};
      recipient.owned_nodes.forEach((node) => {
        const parts = node.name.split(" -> ");
        const project = parts[0] || "Unknown Project";
        projectCounts[project] = (projectCounts[project] || 0) + 1;
      });
      return Object.entries(projectCounts).map(([project, count]) => (
        <div key={project} className="flex gap-2 items-center text-sm text-yellow-800">
          <span className="font-medium">{project}</span>
          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-800 rounded-full">
            {count} propert{count > 1 ? "ies" : "y"}
          </span>
        </div>
      ));
    }
    return null;
  };

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: SubmitInvoicePayload) => createInvoice(payload),
    onSuccess: (data) => {
      console.log("data", data);
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success(data.message);
      
      // Invalidate invoice-related queries with correct keys
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-table"] });
      
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create invoice");
    },
  });

  // Click outside handler to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
      if (
        projectSearchRef.current &&
        !projectSearchRef.current.contains(event.target as Node)
      ) {
        setShowProjectSearchResults(false);
      }
      if (
        unitSearchRef.current &&
        !unitSearchRef.current.contains(event.target as Node)
      ) {
        setShowUnitSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Clear selected recipients when recipient type changes
  useEffect(() => {
    setValue("selectedRecipients", []);
    setValue("selectedRecipientObjects", []);
    setActiveTenantId(null);
  }, [formData.recipientType, setValue]);

  // Trigger search when query changes
  useEffect(() => {
    search(searchQuery);
  }, [searchQuery, formData.recipientType, search]);

  // Initialize active tenant when recipients are selected
  useEffect(() => {
    if (formData.selectedRecipientObjects.length > 0 && !activeTenantId) {
      setActiveTenantId(formData.selectedRecipientObjects[0].id);
    }
  }, [formData.selectedRecipientObjects, activeTenantId]);

  // Check if form is complete for enabling buttons
  const isFormComplete = () => {
    // Check if at least one recipient is selected
    if (formData.selectedRecipientObjects.length === 0) return false;
    
    // Check if due date is selected
    if (!formData.dueDate) return false;
    
    // Check if issue date is filled
    if (!formData.issueDate) return false;
    
    // Check if selected recipients have items
    const recipientsWithItems = formData.selectedRecipientObjects.filter((recipient) =>
      (recipient.type === 'tenant' && recipient.rented_units.length > 0) ||
      (recipient.type === 'owner' && recipient.owned_nodes.length > 0)
    );
    
    if (recipientsWithItems.length === 0) return false;
    
    return true;
  };

  const handleSubmit = async (status: "draft" | "issued" = "issued") => {
    // Prepare form data for validation
    const formDataForValidation = {
      recipientType: formData.recipientType,
      dueDate: formData.dueDate,
      issueDate: formData.issueDate,
      notes: formData.notes,
      taxPercentage: formData.taxPercentage,
      discountPercentage: formData.discountPercentage,
      selectedRecipients: formData.selectedRecipients,
      selectedRecipientObjects: formData.selectedRecipientObjects,
    };

    // Validate form data with Zod
    const validationResult = InvoiceFormSchema.safeParse(formDataForValidation);
    
    if (!validationResult.success) {
      // Show validation errors
      const errors = validationResult.error.errors;
      const errorMessages = errors.map(error => error.message).join(", ");
      toast.error(`Validation failed: ${errorMessages}`);
      return;
    }

    // Check if recipients have items to display
    const recipientsWithItems = formData.selectedRecipientObjects.filter((recipient) =>
      (recipient.type === 'tenant' && recipient.rented_units.length > 0) ||
      (recipient.type === 'owner' && recipient.owned_nodes.length > 0)
    );

    if (recipientsWithItems.length === 0) {
      toast.error("Selected recipients have no items to invoice");
      return;
    }

    // Use drafts from Jotai atom like the old modal
    const recipients = drafts.map(({ id, type, name, units }) => {
      const selectedItems = selectedItemsByRecipient[id] || new Set();
      
      return {
        id,
        type,
        name,
        units: (units ?? []).map((unit: any) => ({
          unitId: unit.unitId || unit.nodeId || "",
          unitName: unit.unitName || unit.nodeName || "",
          items: unit.items.filter((item: any) => {
            // Only include items that are selected (checked)
            const key = `${unit.unitId || ""}_${item.serviceId || item.description}`;
            return selectedItems.has(key);
          }).map((item: any) => {
            return {
              description: item.description,
              node_name: item.node_name || item.nodeName || unit.unitName || "",
              type: item.type,
              quantity: Number(item.quantity) || 1,
              amount: Number(item.amount) || 0, // Single item amount
              price: Number(item.price) || 0, // Total amount (amount × quantity)
              percentage_rate: item.percentage_rate ? Number(item.percentage_rate) : null,
              currency: item.currency || {},
              inputRequired: item.inputRequired || false,
              serviceId: item.serviceId || null,
              unitId: unit.unitId || "",
              penaltyId: item.penaltyId || null,
            };
          }),
        })),
        nodes: [], // Empty array for now since we're using units for both
      };
    });

    const payload: SubmitInvoicePayload = {
      recipients,
      dueDate: formData.dueDate?.toISOString().split("T")[0] || "",
      issueDate: formData.issueDate,
      notes: formData.notes,
      taxPercentage: formData.taxPercentage,
      discountPercentage: formData.discountPercentage,
      status,
    };

    createInvoiceMutation.mutate(payload);
  };

  const handleRecipientSelect = (recipient: Recipient) => {
    if (!formData.selectedRecipientObjects.some((r) => r.id === recipient.id)) {
      const currentRecipients = formData.selectedRecipientObjects;
      const currentRecipientIds = formData.selectedRecipients;
      
      const recipientForForm = {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
        type: recipient.type as "tenant" | "owner",
        rented_units: recipient.rented_units,
        owned_nodes: recipient.owned_nodes,
      };
      
      setValue("selectedRecipientObjects", [...currentRecipients, recipientForForm]);
      setValue("selectedRecipients", [...currentRecipientIds, recipient.id]);
    }
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleRecipientRemove = (recipientId: string) => {
    const currentRecipients = formData.selectedRecipientObjects.filter((r) => r.id !== recipientId);
    const currentRecipientIds = formData.selectedRecipients.filter((id) => id !== recipientId);
    
    setValue("selectedRecipientObjects", currentRecipients);
    setValue("selectedRecipients", currentRecipientIds);
  };

  return (
    <div className="space-y-6">
      {/* Recipients Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2 items-center">
            <Search className="w-5 h-5" />
            Select Recipients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recipient Type */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="recipientType" className="text-sm font-medium">
                Recipient Type
              </Label>
              <Select
                value={formData.recipientType}
                onValueChange={(value) =>
                  setValue("recipientType", value as "tenant" | "owner")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipients Search */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="recipients" className="text-sm font-medium">
                Recipients{" "}
                {formData.selectedRecipientObjects.length > 0 && (
                  <span className="ml-1 font-semibold text-blue-600">
                    ({formData.selectedRecipientObjects.length})
                  </span>
                )}
              </Label>
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                <Input
                  placeholder={`Search ${formData.recipientType}s...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setTimeout(() => setIsInputFocused(false), 150)}
                  className="pl-10"
                />
                {formData.selectedRecipientObjects.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setValue("selectedRecipientObjects", [])}
                    className="absolute right-2 top-1/2 p-0 w-6 h-6 text-red-600 transform -translate-y-1/2 hover:text-red-700"
                  >
                    ×
                  </Button>
                )}
              </div>

              {/* Search Results */}
              {searchQuery.length >= 3 && (isInputFocused || searchQuery.length > 0) && (
                <div className="overflow-y-auto absolute z-10 mt-1 w-full max-h-60 bg-white rounded-md border border-gray-200 shadow-lg">
                  {recipientsLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading...</div>
                  ) : recipients.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No recipients found</div>
                  ) : (
                    recipients
                      .filter((r: Recipient) => !formData.selectedRecipientObjects.some((sel) => sel.id === r.id))
                      .map((recipient: Recipient) => {
                        const isTenantNoUnits =
                          recipient.type === "tenant" && recipient.rented_units.length === 0;
                        const isOwnerNoNodes =
                          recipient.type === "owner" && recipient.owned_nodes.length === 0;
                        const isDisabled = isTenantNoUnits || isOwnerNoNodes;
                        
                        return (
                          <div
                            key={recipient.id}
                            className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 last:border-b-0 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                            onClick={() => {
                              if (isDisabled) return;
                              handleRecipientSelect(recipient);
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium">{recipient.name}</div>
                                <div className="text-sm text-gray-600">{recipient.email}</div>
                                {recipient.phone && (
                                  <div className="text-sm text-gray-600">{recipient.phone}</div>
                                )}
                              </div>
                              <div className="flex gap-2 items-center ml-2">
                                <Badge variant="outline" className="text-xs">
                                  {recipient.type}
                                </Badge>
                                {isTenantNoUnits && (
                                  <Badge variant="destructive" className="text-xs">
                                    No units
                                  </Badge>
                                )}
                                {isOwnerNoNodes && (
                                  <Badge variant="destructive" className="text-xs">
                                    No properties
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected Recipients */}
          {formData.selectedRecipientObjects.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Selected Recipients</Label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {formData.selectedRecipientObjects.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="mb-2 text-lg font-semibold text-blue-900">
                          {recipient.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {recipient.type} • {recipient.email}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="self-start px-2 text-red-500 rounded hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRecipientRemove(recipient.id)}
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Section - Only show for recipients with items */}
      {formData.selectedRecipientObjects.some((recipient) =>
        (recipient.type === 'tenant' && recipient.rented_units.length > 0) ||
        (recipient.type === 'owner' && recipient.owned_nodes.length > 0)
      ) && (
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
                <Label htmlFor="issueDate" className="text-sm font-medium">
                  Issue Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) =>
                    setValue("issueDate", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-sm font-medium">
                  Due Date <span className="text-red-500">*</span>
                </Label>
                <DatePicker
                  value={formData.dueDate}
                  onChange={(date: Date | undefined) =>
                    setValue("dueDate", date)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="taxPercentage" className="text-sm font-medium">
                  Tax Percentage (%)
                </Label>
                <Input
                  type="number"
                  // value={formData.taxPercentage}
                  onChange={(e) =>
                    setValue("taxPercentage", Number(e.target.value))
                  }
                  // min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercentage" className="text-sm font-medium">
                  Discount Percentage (%)
                </Label>
                <Input
                  type="number"
                  // value={formData.discountPercentage}
                  onChange={(e) =>
                    setValue("discountPercentage", Number(e.target.value))
                  }
                  // min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setValue("notes", e.target.value)
                }
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Items Section - Only show for recipients with items */}
      {formData.selectedRecipientObjects.some((recipient) =>
        (recipient.type === 'tenant' && recipient.rented_units.length > 0) ||
        (recipient.type === 'owner' && recipient.owned_nodes.length > 0)
      ) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <Plus className="w-5 h-5" />
              Invoice Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {formData.selectedRecipientObjects.filter((recipient) =>
                (recipient.type === 'tenant' && recipient.rented_units.length > 0) ||
                (recipient.type === 'owner' && recipient.owned_nodes.length > 0)
              ).map((recipient) => (
                <div key={recipient.id} className="space-y-4">
                  {/* Recipient Header */}
                  <div className="flex gap-3 items-center pb-2 border-b border-gray-200">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{recipient.name}</h4>
                      <p className="text-sm text-gray-600">{recipient.type} • {recipient.email}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {recipient.type}
                    </Badge>
                  </div>
                  
                  {/* Items for this recipient */}
                  <TenantItemsTab
                    tenant={recipient}
                    step="items"
                    currency={defaultCurrency}
                    onSelectedItemsChange={(selectedItems) => {
                      setSelectedItemsByRecipient(prev => ({
                        ...prev,
                        [recipient.id]: selectedItems
                      }));
                    }}
                  />
                </div>
              ))}
              
              {/* Summary */}
              <div className="p-4 mt-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="text-sm font-medium">{defaultCurrency.symbol} {summaryTotals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Discount ({formData.discountPercentage}%):</span>
                      <span className="text-sm font-medium text-red-600">- {defaultCurrency.symbol} {summaryTotals.discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax ({formData.taxPercentage}%):</span>
                    <span className="text-sm font-medium text-green-600">+ {defaultCurrency.symbol} {summaryTotals.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-lg font-bold">{defaultCurrency.symbol} {summaryTotals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons - Only show for recipients with items */}
      {formData.selectedRecipientObjects.some((recipient) =>
        (recipient.type === 'tenant' && recipient.rented_units.length > 0) ||
        (recipient.type === 'owner' && recipient.owned_nodes.length > 0)
      ) && (
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={createInvoiceMutation.isPending || !isFormComplete()}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit("issued")}
            disabled={createInvoiceMutation.isPending || !isFormComplete()}
          >
            <Save className="mr-2 w-4 h-4" />
            Create Invoice
          </Button>
        </div>
      )}
    </div>
  );
};

export default InvoiceCreate; 