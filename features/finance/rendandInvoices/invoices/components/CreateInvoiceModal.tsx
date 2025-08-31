"use client";

import {
  DollarSign,
  Plus,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecipientSearch } from "@/hooks/finance/useRecipientSearch";
import type {
  Recipient,
  SubmitInvoicePayload,
} from "@/features/finance/scehmas/invoice";
import TenantItemsTab from "./TenantItemsTab";
import type { TenantUnitDraft } from "@/store/nvoiceDrafts";
import { toast } from "sonner";

// 1. Update InvoiceItem type
interface InvoiceItem {
  description: string;
  type:
    | "rent"
    | "fixed_service"
    | "percentage_service"
    | "variable_service"
    | "penalty"
    | "other";
  quantity: number;
  rate: number | null;
  amount: number | null;
  currency: string;
  inputRequired?: boolean;
  serviceId?: string;
  unitId?: string;
  penaltyId?: string;
}

interface TenantInvoiceDraft {
  tenantId: string;
  items: InvoiceItem[];
}

interface CreateInvoiceState {
  recipients: string[]; // tenant IDs
  tenantDrafts: Record<string, TenantInvoiceDraft>;
  // ...global fields (dueDate, tax, discount, notes, etc.)
}

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
}

const getDefaultItem = () => ({
  description: `Rent For ${new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  })}`,
  type: "rent" as const,
  quantity: 1,
  rate: 0,
  amount: 0,
  currency: "USD", // Add default currency
});

const CreateInvoiceModal = ({ open, onClose }: CreateInvoiceModalProps) => {
  // --- State ---
  const [formData, setFormData] = useState({
    recipientType: "tenant",
    dueDate: undefined as Date | undefined,
    issueDate: new Date().toISOString().split("T")[0],
    notes: "",
    isRecurring: false,
    recurringFrequency: "monthly",
    recurringEndDate: "",
    taxPercentage: 0,
    discountPercentage: 0,
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

  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedRecipientObjects, setSelectedRecipientObjects] = useState<
    Recipient[]
  >([]);
  const [tenantDrafts, setTenantDrafts] = useState<
    Record<string, TenantInvoiceDraft>
  >({});
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "items" | "settings" | "review">(
    "select"
  );
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
  const [showProjectSearchResults, setShowProjectSearchResults] =
    useState(false);
  const [showUnitSearchResults, setShowUnitSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const projectSearchRef = useRef<HTMLDivElement>(null);
  const unitSearchRef = useRef<HTMLDivElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  // Remove expandedTenantId state

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

  // Clear selected recipients and drafts when recipient type changes
  useEffect(() => {
    setSelectedRecipients([]);
    setSelectedRecipientObjects([]);
    setTenantDrafts({});
    setActiveTenantId(null);
  }, [formData.recipientType]);

  // Trigger search when query changes
  useEffect(() => {
    search(searchQuery);
  }, [searchQuery, formData.recipientType, search]);

  // 3. Add loading state for each tenant
  // Remove old useEffect for loading tenant items

  // --- Handlers ---
  useEffect(() => {
    // When recipients change, initialize drafts
    const newDrafts: Record<string, TenantInvoiceDraft> = {};
    selectedRecipients.forEach((tenantId) => {
      newDrafts[tenantId] = tenantDrafts[tenantId] || {
        tenantId,
        items: [getDefaultItem()],
      };
    });
    setTenantDrafts(newDrafts);
    if (selectedRecipients.length > 0) {
      setActiveTenantId(selectedRecipients[0]);
    } else {
      setActiveTenantId(null);
    }
  }, [selectedRecipients]);

  const handleTenantItemChange = (
    tenantId: string,
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setTenantDrafts((prev) => {
      const items = [...(prev[tenantId]?.items || [])];
      items[index] = { ...items[index], [field]: value };
      if (field === "quantity" || field === "rate") {
        const item = items[index];
        items[index].amount = (item.quantity || 0) * (item.rate || 0);
      }
      return { ...prev, [tenantId]: { ...prev[tenantId], items } };
    });
  };

  const handleAddTenantItem = (tenantId: string) => {
    setTenantDrafts((prev) => {
      const items = [...(prev[tenantId]?.items || [])];
      // Use the currency of the first item if available, else default to USD
      const currency = items[0]?.currency || "USD";
      items.push({
        description: "",
        type: "other",
        quantity: 1,
        rate: 0,
        amount: 0,
        currency,
      });
      return { ...prev, [tenantId]: { ...prev[tenantId], items } };
    });
  };

  const handleRemoveTenantItem = (tenantId: string, index: number) => {
    setTenantDrafts((prev) => {
      const items = [...(prev[tenantId]?.items || [])];
      if (items.length > 1) items.splice(index, 1);
      return { ...prev, [tenantId]: { ...prev[tenantId], items } };
    });
  };

  // --- Calculation helpers ---
  const calculateSubtotal = (items: any[]) =>
    items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const calculateTax = (items: any[]) =>
    calculateSubtotal(items) * (formData.taxPercentage / 100);
  const calculateDiscount = (items: any[]) =>
    calculateSubtotal(items) * (formData.discountPercentage / 100);
  const calculateTotal = (items: any[]) =>
    calculateSubtotal(items) - calculateDiscount(items) + calculateTax(items);


  const queryClient = useQueryClient();
  
  // --- Mutation for invoice creation ---
  const { mutate: submitInvoice, isPending: isSubmitting } = useMutation({
    mutationFn: createInvoice,
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success(data.message);
      // Invalidate queries to refetch invoice table and stats
      queryClient.invalidateQueries({ queryKey: ["invoice-table"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      onClose();
      // Reset modal state and stores
      setStep("select");
      setInvoiceDrafts([]);
      setFormData({
        recipientType: "tenant",
        dueDate: undefined,
        issueDate: new Date().toISOString().split("T")[0],
        notes: "",
        isRecurring: false,
        recurringFrequency: "monthly",
        recurringEndDate: "",
        taxPercentage: 0,
        discountPercentage: 0,
      });
      setSelectedRecipients([]);
      setSelectedRecipientObjects([]);
      setTenantDrafts({});
      setActiveTenantId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || error);
      
      // Optionally, show a toast
    },
  });

  // --- Submission ---
  // Update handleSubmit to accept a status argument
  const handleSubmit = async (status: "draft" | "issued" = "issued") => {
    try {
      const recipients = invoiceDrafts.map(({ id, type, name, units }) => ({
        id,
        type,
        name,
        units: (units ?? []).map((unit: any) => ({
          unitId: unit.unitId || unit.nodeId || "",
          unitName: unit.unitName || unit.nodeName || "",
          items: unit.items.map((item: any) => {
            console.log("Item structure:", item);
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
      }));

      // --- Validation ---
      if (!recipients.length) {
        alert("You must add at least one recipient.");
        return;
      }
      if (!formData.dueDate || !formData.issueDate) {
        alert("Due date and issue date are required.");
        return;
      }
      // Add more field checks as needed

      const payload: SubmitInvoicePayload = {
        recipients,
        dueDate: formData.dueDate
          ? new Date(formData.dueDate).toISOString().slice(0, 10)
          : "",
        issueDate: formData.issueDate
          ? new Date(formData.issueDate).toISOString().slice(0, 10)
          : "",
        notes: formData.notes,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.recurringFrequency,
        recurringEndDate: formData.recurringEndDate,
        taxPercentage: formData.taxPercentage,
        discountPercentage: formData.discountPercentage,
        status: status,
      };
      
      console.log("Invoice Payload:", JSON.stringify(payload, null, 2));
      submitInvoice(payload);
    } catch (error) {
      
    }
  };

  
  // 1. Global Invoice Settings Card
  const GlobalInvoiceSettings = (
    <div className="flex flex-wrap gap-6 items-end p-4 mb-6 bg-blue-50 rounded-xl border border-blue-100">
      <div className="flex flex-col gap-1 w-40">
        <Label htmlFor="dueDate" className="text-sm text-gray-600">
          Due Date
        </Label>
        <DatePicker
          value={formData.dueDate}
          onChange={(date) =>
            setFormData((prev) => ({ ...prev, dueDate: date }))
          }
          minDate={new Date()}
        />
      </div>
      <div className="flex flex-col gap-1 w-32">
        <Label htmlFor="taxPercentage" className="text-sm text-gray-600">
          Tax %
        </Label>
        <Input
          id="taxPercentage"
          type="number"
          // value={formData.taxPercentage}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              taxPercentage: parseFloat(e.target.value) || 0,
            }))
          }
          // min=""
          max="100"
          step="0.01"
          className="text-right"
        />
      </div>
      <div className="flex flex-col gap-1 w-32">
        <Label htmlFor="discountPercentage" className="text-sm text-gray-600">
          Discount %
        </Label>
        <Input
          id="discountPercentage"
          type="number"
          value={formData.discountPercentage}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              discountPercentage: parseFloat(e.target.value) || 0,
            }))
          }
          min="0"
          max="100"
          step="0.01"
          className="text-right"
        />
      </div>
    </div>
  );

  // 1. Update steps array for four steps
  const steps = [
    { label: "Select Tenants" },
    { label: "Invoice Items" },
    { label: "Invoice Settings" },
    { label: "Review" },
  ];

  // Helper to get tenant name by ID
  const getTenantName = (tenantId: string) => {
    const tenant = recipients.find((r: Recipient) => r.id === tenantId);
    return tenant ? tenant.name : tenantId;
  };

  // --- UI ---
  const isFetchingTenantItems = useIsFetching({
    queryKey: ["tenant-unit-items"],
  });
  const [invoiceDrafts, setInvoiceDrafts] = useAtom(invoiceDraftsAtom);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const totalCards = invoiceDrafts.length;

  const goLeft = () => setCarouselIndex((i) => Math.max(i - 1, 0));
  const goRight = () =>
    setCarouselIndex((i) => Math.min(i + 1, totalCards - 1));

  useEffect(() => {
    if (!open) {
      setInvoiceDrafts([]);
    }
    // Optionally, clear on mount/unmount for safety
    return () => setInvoiceDrafts([]);
  }, [open, setInvoiceDrafts]);

  useEffect(() => {
    setInvoiceDrafts([]);
  }, [formData.recipientType, setInvoiceDrafts]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      setInvoiceDrafts([]);
    }
  }, [searchQuery, setInvoiceDrafts]);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeCard, setActiveCard] = useState(0);

  // Handler for dot click
  const handleDotClick = (idx: number) => {
    cardRefs.current[idx]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    setActiveCard(idx);
  };

  // Optionally, update activeCard on scroll (not required for basic dot highlight)

  // --- Always open the first tenant tab and initialize drafts for all selected tenants on entering 'items' step ---
  useEffect(() => {
    if (step === "items" && selectedRecipientObjects.length > 0) {
      // Open the first tenant tab
      setActiveTenantId(selectedRecipientObjects[0].id);
      // Ensure all selected tenants have a draft
      setTenantDrafts((prev) => {
        const newDrafts = { ...prev };
        selectedRecipientObjects.forEach((tenant) => {
          if (!newDrafts[tenant.id]) {
            newDrafts[tenant.id] = {
              tenantId: tenant.id,
              items: [getDefaultItem()],
            };
          }
        });
        return newDrafts;
      });
    }
  }, [step, selectedRecipientObjects]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="overflow-y-auto min-w-[1000px]">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Plus className="w-5 h-5" />
            Create New Invoice
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Stepper Navigation */}
          <div className="flex gap-6 items-center mb-5 w-full">
            {steps.map((stepObj, idx) => (
              <div key={stepObj.label} className="flex gap-2 items-center">
                <button
                  type="button"
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors font-semibold text-base ${
                    step === ["select", "items", "settings", "review"][idx]
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-500 border-gray-300"
                  }`}
                  onClick={() =>
                    setStep(
                      ["select", "items", "settings", "review"][
                        idx
                      ] as typeof step
                    )
                  }
                  aria-current={
                    step === ["select", "items", "settings", "review"][idx]
                      ? "step"
                      : undefined
                  }
                  disabled={
                    (idx === 1 && selectedRecipients.length === 0) ||
                    (idx === 2 && selectedRecipients.length === 0) ||
                    (idx === 3 && selectedRecipients.length === 0)
                  }
                >
                  {idx + 1}
                </button>
                <span
                  className={`text-sm font-medium ${
                    step === ["select", "items", "settings", "review"][idx]
                      ? "text-primary"
                      : "text-gray-500"
                  }`}
                >
                  {stepObj.label}
                </span>
                {idx < steps.length - 1 && (
                  <span className="w-8 h-0.5 bg-gray-200 rounded" />
                )}
              </div>
            ))}
          </div>
          {/* Step 1: Select Recipients */}
          {step === "select" && (
            <div className="w-full">
              <div className="flex gap-3 items-center mb-4">
                <div className="flex justify-center items-center w-8 h-8 bg-blue-100 rounded-lg">
                  <Search className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Select Recipients
                  </h3>
                  <p className="text-sm text-gray-600">
                    Choose tenants for whom you want to create invoices.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 mb-2 md:grid-cols-3">
                {/* Recipient Type */}
                <div className="space-y-2">
                  <Label
                    htmlFor="recipientType"
                    className="text-sm font-medium text-gray-700"
                  >
                    Recipient Type
                  </Label>
                  <Select
                    value={formData.recipientType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, recipientType: value }))
                    }
                  >
                    <SelectTrigger className="w-full !h-10 bg-white border border-gray-200 focus:ring-1 focus:ring-blue-200 focus:border-blue-300 transition">
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
                  <Label
                    htmlFor="recipients"
                    className="text-sm font-medium text-gray-700"
                  >
                    Recipients{" "}
                    {selectedRecipientObjects.length > 0 && (
                      <span className="ml-1 font-semibold text-blue-600">
                        ({selectedRecipientObjects.length})
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                    <Input
                      placeholder={`Search ${formData.recipientType}s...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() =>
                        setTimeout(() => setIsInputFocused(false), 150)
                      }
                      className="bg-white pl-10 border border-gray-200 !h-10 focus:ring-1 focus:ring-blue-200 focus:border-blue-300 transition"
                    />
                    {selectedRecipientObjects.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRecipientObjects([])}
                        className="absolute right-2 top-1/2 p-0 w-6 h-6 text-red-600 transform -translate-y-1/2 hover:text-red-700"
                      >
                        ×
                      </Button>
                    )}
                    {/* Searched User Preview (optional, keep minimal if needed) */}
                    {searchQuery.length >= 3 &&
                      (isInputFocused || searchQuery.length > 0) &&
                      (() => {
                        const previewUser = recipients
                          .filter(
                            (r: Recipient) =>
                              !selectedRecipientObjects.some(
                                (sel) => sel.id === r.id
                              )
                          )
                          .find(
                            (r: Recipient) =>
                              r.name
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase()) ||
                              r.email
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase()) ||
                              (r.phone && r.phone.includes(searchQuery))
                          );
                        if (!previewUser) return null;
                        // --- Group by project ---
                        let projectSummary: React.ReactNode = null;
                        if (formData.recipientType === "tenant" && previewUser.rented_units.length > 0) {
                          const projectCounts: Record<string, number> = {};
                          previewUser.rented_units.forEach((unit) => {
                            const parts = unit.name.split(" -> ");
                            const project = parts[0] || "Unknown Project";
                            projectCounts[project] = (projectCounts[project] || 0) + 1;
                          });
                          projectSummary = (
                            <span className="ml-2 text-xs font-medium text-blue-700">
                              {Object.entries(projectCounts).map(([project, count], idx) => (
                                <span key={project} className="mr-2">
                                  {project} - {count} unit{count > 1 ? "s" : ""}
                                  {idx < Object.entries(projectCounts).length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </span>
                          );
                        } else if (formData.recipientType === "owner" && previewUser.owned_nodes.length > 0) {
                          const projectCounts: Record<string, number> = {};
                          previewUser.owned_nodes.forEach((node) => {
                            const parts = node.name.split(" -> ");
                            const project = parts[0] || "Unknown Project";
                            projectCounts[project] = (projectCounts[project] || 0) + 1;
                          });
                          projectSummary = (
                            <span className="ml-2 text-xs font-medium text-yellow-700">
                              {Object.entries(projectCounts).map(([project, count], idx) => (
                                <span key={project} className="mr-2">
                                  {project} - {count} propert{count > 1 ? "ies" : "y"}
                                  {idx < Object.entries(projectCounts).length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </span>
                          );
                        }
                        return (
                          <div className="mt-2 mb-2 text-sm text-gray-700">
                            <span className="font-semibold text-blue-900">
                              {previewUser.name}
                            </span>
                            {projectSummary}
                          </div>
                        );
                      })()}
                    {/* Search Results Dropdown */}
                    {(isInputFocused || searchQuery.length > 0) && (
                      <div className="overflow-y-auto absolute z-10 mt-1 w-full max-h-60 bg-white rounded-lg border border-gray-200 shadow-none">
                        {recipientsLoading && (
                          <div className="p-3 text-center text-gray-500">
                            Loading...
                          </div>
                        )}
                        {recipientsError && (
                          <div className="p-3 text-center text-red-500">
                            {recipientsError}
                          </div>
                        )}
                        {!recipientsLoading &&
                          recipients.filter(
                            (r: Recipient) =>
                              !selectedRecipientObjects.some(
                                (sel) => sel.id === r.id
                              )
                          ).length === 0 &&
                          searchQuery.length >= 3 && (
                            <div className="p-3 text-center text-gray-500">
                              No {formData.recipientType}s found
                            </div>
                          )}
                        {recipients
                          .filter(
                            (r: Recipient) =>
                              !selectedRecipientObjects.some(
                                (sel) => sel.id === r.id
                              )
                          )
                          .map((recipient: Recipient) => {
                            const isTenantNoUnits =
                              recipient.type === "tenant" &&
                              recipient.rented_units.length === 0;
                            const isOwnerNoNodes =
                              recipient.type === "owner" &&
                              recipient.owned_nodes.length === 0;
                            const isDisabled =
                              isTenantNoUnits || isOwnerNoNodes;
                            // --- Group by project summary ---
                            let projectSummary: React.ReactNode = null;
                            if (recipient.type === "tenant" && recipient.rented_units.length > 0) {
                              const projectCounts: Record<string, number> = {};
                              recipient.rented_units.forEach((unit) => {
                                const parts = unit.name.split(" -> ");
                                const project = parts[0] || "Unknown Project";
                                projectCounts[project] = (projectCounts[project] || 0) + 1;
                              });
                              projectSummary = (
                                <span className="ml-2 text-xs font-medium text-blue-700">
                                  {Object.entries(projectCounts).map(([project, count], idx) => (
                                    <span key={project} className="mr-2">
                                      {project} - {count} unit{count > 1 ? "s" : ""}
                                      {idx < Object.entries(projectCounts).length - 1 ? ", " : ""}
                                    </span>
                                  ))}
                                </span>
                              );
                            } else if (recipient.type === "owner" && recipient.owned_nodes.length > 0) {
                              const projectCounts: Record<string, number> = {};
                              recipient.owned_nodes.forEach((node) => {
                                const parts = node.name.split(" -> ");
                                const project = parts[0] || "Unknown Project";
                                projectCounts[project] = (projectCounts[project] || 0) + 1;
                              });
                              projectSummary = (
                                <span className="ml-2 text-xs font-medium text-yellow-700">
                                  {Object.entries(projectCounts).map(([project, count], idx) => (
                                    <span key={project} className="mr-2">
                                      {project} - {count} propert{count > 1 ? "ies" : "y"}
                                      {idx < Object.entries(projectCounts).length - 1 ? ", " : ""}
                                    </span>
                                  ))}
                                </span>
                              );
                            }
                            return (
                              <div
                                key={recipient.id}
                                className={`flex flex-col gap-1 p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 last:border-b-0 ${
                                  isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                                onMouseDown={() => {
                                  if (isDisabled) return;
                                  setSelectedRecipientObjects([
                                    ...selectedRecipientObjects,
                                    recipient,
                                  ]);
                                  setSearchQuery("");
                                }}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium">{recipient.name}</div>
                                    <div className="text-sm text-gray-600">{recipient.email}</div>
                                    {recipient.phone && (
                                      <div className="text-sm text-gray-600">{recipient.phone}</div>
                                    )}
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <div className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded">
                                      {recipient.type}
                                    </div>
                                    {isTenantNoUnits && (
                                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full border border-red-200 ml-2">
                                        No units
                                      </span>
                                    )}
                                    {isOwnerNoNodes && (
                                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full border border-red-200 ml-2">
                                        No properties
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Project summary */}
                                {projectSummary}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Selected Recipients Grid */}
              <div className="mt-8">
                <div className="mb-2 text-lg font-semibold text-gray-800">
                  Selected Recipients
                </div>
                {selectedRecipientObjects.length === 0 ? (
                  <div className="flex justify-center items-center h-20 italic text-gray-400">
                    No recipients selected yet. Use the search above to add
                    tenants or owners.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {selectedRecipientObjects.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex flex-col gap-2 p-4 bg-gray-100 rounded-lg border border-gray-200"
                      >
                        <div className="mb-2 text-lg font-semibold text-blue-900">
                          {recipient.name}
                        </div>
                        <div className="flex flex-col gap-1">
                          {recipient.type === "tenant" && (() => {
                            // Group units by project
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
                          })()}
                          {recipient.type === "owner" && (() => {
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
                          })()}
                        </div>
                        <button
                          type="button"
                          className="self-end px-2 mt-2 ml-auto text-red-500 hover:text-red-700"
                          onClick={() =>
                            setSelectedRecipientObjects(
                              selectedRecipientObjects.filter(
                                (r) => r.id !== recipient.id
                              )
                            )
                          }
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setStep("items")}
                  disabled={selectedRecipientObjects.length === 0}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          {/* Step 2: Per-Tenant Invoice Items */}
          {step === "items" && selectedRecipientObjects.length > 0 && (
            <div className="p-6 w-full rounded-xl">
              <Tabs
                value={activeTenantId ?? undefined}
                onValueChange={setActiveTenantId}
                className="w-full"
              >
                <TabsList className="mb-4">
                  {selectedRecipientObjects.map((recipient) => (
                    <TabsTrigger
                      key={recipient.id}
                      value={recipient.id}
                      className="capitalize"
                    >
                      {recipient.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {selectedRecipientObjects.map((recipient) => (
                  <TabsContent
                    key={recipient.id}
                    value={recipient.id}
                    className="space-y-4"
                  >
                    <TenantItemsTab tenant={recipient} step={step} currency={defaultCurrency} />
                  </TabsContent>
                ))}
              </Tabs>
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep("select")}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep("settings")}
                  disabled={isFetchingTenantItems > 0}
                >
                  Next: Invoice Settings
                </Button>
              </div>
            </div>
          )}
          {/* Step 3: Global Invoice Settings */}
          {step === "settings" && (
            <div className="p-6 w-full rounded-xl">
              <div className="flex gap-6 items-end p-4 mb-6 rounded-xl">
                <div className="w-full">
                  <Label htmlFor="dueDate" className="text-sm text-gray-600">
                    Due Date
                  </Label>
                  <DatePicker
                    value={formData.dueDate}
                    onChange={(date) =>
                      setFormData((prev) => ({ ...prev, dueDate: date }))
                    }
                    minDate={new Date()}
                  />
                </div>
                <div className="w-full">
                  <Label
                    htmlFor="taxPercentage"
                    className="text-sm text-gray-600"
                  >
                    Tax %
                  </Label>
                  <Input
                    id="taxPercentage"
                    type="number"
                    value={formData.taxPercentage}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        taxPercentage: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min="0"
                    max="100"
                    step="0.01"
                    className="text-right"
                  />
                </div>
                <div className="w-full">
                  <Label
                    htmlFor="discountPercentage"
                    className="text-sm text-gray-600"
                  >
                    Discount %
                  </Label>
                  <Input
                    id="discountPercentage"
                    type="number"
                    value={formData.discountPercentage}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        discountPercentage: parseFloat(e.target.value) || 0,
                      }))
                    }
                    min="0"
                    max="100"
                    step="0.01"
                    className="text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep("items")}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep("review")}
                  disabled={!formData.dueDate}
                >
                  Next: Review
                </Button>
              </div>
            </div>
          )}
          {/* Step 4: Review Step */}
          {step === "review" && (
            <>
              {/* Global summary row */}
              <div className="flex gap-4 items-center mb-6 w-full">
                <span className="px-3 py-1 font-medium text-blue-800 bg-blue-100 rounded-full">
                  Due:{" "}
                  {formData.dueDate
                    ? new Date(formData.dueDate).toLocaleDateString()
                    : "-"}
                </span>
                <span className="px-3 py-1 font-medium text-green-800 bg-green-100 rounded-full">
                  Tax: {formData.taxPercentage}%
                </span>
                <span className="px-3 py-1 font-medium text-purple-800 bg-purple-100 rounded-full">
                  Discount: {formData.discountPercentage}%
                </span>
              </div>
              <h3 className="mb-4 text-xl font-bold text-blue-900">
                Review Invoices
              </h3>
              <div className="relative">
                {/* Left gradient overlay */}
                <div className="absolute top-0 left-0 z-10 w-8 h-full bg-gradient-to-r to-transparent pointer-events-none from-white/90" />
                {/* Right gradient overlay */}
                <div className="absolute top-0 right-0 z-10 w-8 h-full bg-gradient-to-l to-transparent pointer-events-none from-white/90" />
                <div
                  className="flex overflow-x-auto gap-5 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent"
                  style={{ scrollSnapType: "x mandatory" }}
                >
                  {invoiceDrafts.map((recipient: any, idx: number) => {
                    // Only include checked units
                    const checkedUnits = (recipient.units ?? []).filter((unit: TenantUnitDraft) => unit.isChecked !== false);
                    const total = calculateTotal(checkedUnits.flatMap((unit: TenantUnitDraft) => unit.items ?? []));
                    const subtotal = calculateSubtotal(checkedUnits.flatMap((unit: TenantUnitDraft) => unit.items ?? []));
                    const discount = calculateDiscount(checkedUnits.flatMap((unit: TenantUnitDraft) => unit.items ?? []));
                    const tax = calculateTax(checkedUnits.flatMap((unit: TenantUnitDraft) => unit.items ?? []));
                    const status = "Draft";
                    const statusColor = "bg-blue-100 text-blue-800";
                    return (
                      <div
                        key={recipient.id}
                        ref={(el) => {
                          cardRefs.current[idx] = el;
                        }}
                        className={
                          "flex flex-col min-w-[320px] max-w-[360px] w-full h-[400px] snap-center rounded-2xl border border-blue-100 bg-white transition-all" +
                          (idx === 0 ? " ml-2" : "")
                        }
                        tabIndex={0}
                      >
                        {/* Invoice header row */}
                        <div className="flex justify-between items-center px-4 py-3 text-blue-800 bg-blue-100 rounded-t-2xl">
                          <div className="flex gap-2 items-center">
                            <span className="text-base font-semibold text-blue-900">
                              {recipient.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              {status}
                            </span>
                          </div>
                          <span className="text-xl font-bold text-blue-900">
                            {defaultCurrency.symbol}{Number(total).toFixed(2)}
                          </span>
                        </div>
                        {/* Invoice details */}
                        <div className="flex flex-col flex-1 justify-between px-5 pt-3 pb-5 rounded-b-2xl border-t">
                          <div>
                            <div className="mb-2 text-xs font-medium tracking-wide text-blue-700 uppercase">
                              Invoice Items
                            </div>
                            <ul className="overflow-y-auto pr-1 mb-4 max-h-32 text-sm text-blue-900 divide-y divide-blue-100">
                              {checkedUnits
                                .flatMap((unit: TenantUnitDraft) => unit.items ?? [])
                                .map((item: any, idx: number) => (
                                  <li key={idx} className="flex justify-between items-center py-1">
                                    <span className="font-medium truncate">
                                      ({item.node_name}) {item.description}
                                    </span>
                                    <span className="font-semibold text-blue-800">
                                      {item.price !== null && item.price !== undefined
                                        ? `${item.currency?.symbol ?? defaultCurrency.symbol} ${Number(item.price).toFixed(2)}`
                                        : "-"}
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </div>
                          <div className="flex flex-col gap-1 mt-auto text-sm">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>{defaultCurrency.symbol}{Number(subtotal).toFixed(2)}</span>
                            </div>
                            {formData.discountPercentage > 0 && (
                              <div className="flex justify-between text-purple-700">
                                <span>Discount:</span>
                                <span>- {defaultCurrency.symbol}{Number(discount).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-green-700">
                              <span>Tax:</span>
                              <span>{defaultCurrency.symbol}{Number(tax).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mt-2 font-bold text-blue-800">
                              <span>Total:</span>
                              <span>{defaultCurrency.symbol}{Number(total).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Dots navigation */}
                <div className="flex gap-2 justify-center mt-4">
                  {invoiceDrafts.map((_, idx) => (
                    <button
                      key={idx}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        activeCard === idx
                          ? "bg-blue-600 scale-110"
                          : "bg-blue-200"
                      }`}
                      onClick={() => handleDotClick(idx)}
                      aria-label={`Go to card ${idx + 1}`}
                      type="button"
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-between mt-6">
                <Button variant="outline" onClick={() => setStep("settings")}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleSubmit("draft")}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleSubmit("issued")}
                    disabled={
                      !invoiceDrafts.length ||
                      !formData.dueDate ||
                      !formData.issueDate ||
                      isSubmitting
                    }
                  >
                    Create Invoices
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceModal;
