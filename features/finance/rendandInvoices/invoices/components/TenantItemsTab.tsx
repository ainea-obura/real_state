import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  fetchTenantUnitItems,
  fetchOwnerNodeItems,
} from "@/actions/finance/invoice";
import type {
  Recipient,
  TenantUnitItem as BaseTenantUnitItem,
  TenantUnitItemsResponse,
} from "@/features/finance/scehmas/invoice";
import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { invoiceDraftsAtom, InvoiceRecipientDraft } from "@/store/nvoiceDrafts";

type TenantUnitItem = BaseTenantUnitItem & { percentage?: number };

interface TenantItemsTabProps {
  tenant: any;
  step: string;
  currency: { code: string; symbol: string };
  onSelectedItemsChange?: (selectedItems: Set<string>) => void;
}

// Helper to get a unique key for each item (unit + service)
const getItemKey = (item: TenantUnitItem, unitId: string) =>
  `${unitId}_${item.serviceId || item.description}`;

// Helper to calculate total for a unit
const getUnitTotal = (unit: any, selectedItems: Set<string>, editingPrices: Record<string, string>) => {
  return unit.items.reduce(
    (sum: number, item: any) => {
      const key = getItemKey(item, unit.unitId);
      if (!selectedItems.has(key)) return sum;
      
      // Use editing price if available, otherwise use item.price
      const price = editingPrices[key] ? Number(editingPrices[key]) : Number(item.price) || 0;
      return sum + price;
    },
    0
  );
};

// Helper to extract clean unit name (remove project prefix)
const getCleanUnitName = (unitName: string) => {
  const parts = unitName.split(" -> ");
  return parts.length > 1 ? parts[parts.length - 1] : unitName;
};

// Helper to get unit ancestors in hierarchical format
const getUnitAncestors = (unitName: string) => {
  const parts = unitName.split(" -> ");
  if (parts.length > 1) {
    return parts.join(" > ");
  }
  return unitName;
};

const TenantItemsTab = ({ tenant, step, currency, onSelectedItemsChange }: TenantItemsTabProps) => {
  const [drafts, setDrafts] = useAtom(invoiceDraftsAtom);
  // Find the draft for this tenant
  const draft = drafts.find((d: InvoiceRecipientDraft) => d.id === tenant.id);

  // Use the provided currency
  const displayCurrency = currency.symbol;

  const [editingPrices, setEditingPrices] = useState<Record<string, string>>(
    {}
  );

  // State for selected items
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Use correct fetcher based on recipient type (for initial load only)
  const { data, isLoading } = useQuery<{
    count: number;
    results: {
      unit_id: string;
      unit_name: string;
      node_type: string;
      items: TenantUnitItem[];
    }[];
  }>({
    queryKey: [
      tenant.type === "owner" ? "owner-node-items" : "tenant-unit-items",
      tenant.id,
    ],
    queryFn: () =>
      tenant.type === "owner"
        ? fetchOwnerNodeItems(tenant.id)
        : fetchTenantUnitItems(tenant.id),
    enabled: step === "items" && !draft,
    staleTime: 5 * 60 * 1000,
  });

  // Populate atom after data is fetched and draft is missing
  useEffect(() => {
    if (!draft && data && Array.isArray((data as any).results)) {
      const units = (data as any).results.map((unit: any) => ({
        unitId: unit.unit_id ?? unit.id ?? unit.node_id ?? unit.nodeId ?? "",
        unitName:
          unit.unit_name ?? unit.name ?? unit.node_name ?? unit.nodeName ?? "",
        items: unit.items,
      }));
      setDrafts((prev: InvoiceRecipientDraft[]) => {
        if (prev.some((d) => d.id === tenant.id)) return prev;
        return [
          ...prev,
          {
            id: tenant.id,
            type: tenant.type as "tenant" | "owner",
            name: tenant.name,
            units,
          },
        ];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, draft, setDrafts, tenant.id, tenant.type, tenant.name]);

  // Initialize selected items when draft is available
  useEffect(() => {
    if (draft && selectedItems.size === 0) {
      const initialSelected = new Set<string>();
      
      draft.units.forEach((unit: any) => {
        unit.items.forEach((item: any) => {
          const key = getItemKey(item, unit.unitId);
          // Default to checked for "DEPOSIT" and "RENT" items
          if (item.type === "DEPOSIT" || item.type === "RENT") {
            initialSelected.add(key);
          }
        });
      });
      
      setSelectedItems(initialSelected);
      // Notify parent component of initial selected items
      onSelectedItemsChange?.(initialSelected);
    }
  }, [draft, selectedItems.size]);

  // Update variable price in the atom
  const handleVariablePriceChange = (
    unitId: string,
    item: TenantUnitItem,
    newPrice: number
  ) => {
    const key = getItemKey(item, unitId);
    setEditingPrices((prev: Record<string, string>) => ({
      ...prev,
      [key]: newPrice.toString(),
    }));
    setDrafts((prev: InvoiceRecipientDraft[]) =>
      prev.map((d: InvoiceRecipientDraft) =>
        d.id === tenant.id
          ? {
              ...d,
              units: d.units.map((unit) =>
                unit.unitId === unitId
                  ? {
                      ...unit,
                      items: unit.items.map((it) =>
                        getItemKey(it, unitId) === key
                          ? { ...it, price: newPrice }
                          : it
                      ),
                    }
                  : unit
              ),
            }
          : d
      )
    );
  };

  // Update quantity in the atom
  const handleQuantityChange = (
    unitId: string,
    item: TenantUnitItem,
    newQuantity: number
  ) => {
    const key = getItemKey(item, unitId);
    setDrafts((prev: InvoiceRecipientDraft[]) =>
      prev.map((d: InvoiceRecipientDraft) =>
        d.id === tenant.id
          ? {
              ...d,
              units: d.units.map((unit) =>
                unit.unitId === unitId
                  ? {
                      ...unit,
                      items: unit.items.map((it) =>
                        getItemKey(it, unitId) === key
                          ? {
                              ...it,
                              quantity: newQuantity,
                              price: (Number(it.amount) || 0) * newQuantity,
                            }
                          : it
                      ),
                    }
                  : unit
              ),
            }
          : d
      )
    );
  };

  // Handle checkbox selection
  const handleItemSelection = (key: string, checked: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      // Notify parent component of selected items change
      onSelectedItemsChange?.(newSet);
      return newSet;
    });
  };

  // Handle select all items in a unit
  const handleSelectAllInUnit = (unit: any, checked: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      unit.items.forEach((item: any) => {
        const key = getItemKey(item, unit.unitId);
        if (checked) {
          newSet.add(key);
        } else {
          newSet.delete(key);
        }
      });
      // Notify parent component of selected items change
      onSelectedItemsChange?.(newSet);
      return newSet;
    });
  };

  if (isLoading && !draft) {
    return (
      <div className="flex justify-center items-center h-32">
        <span className="mr-2 animate-spin">⏳</span> Loading items...
      </div>
    );
  }

  const units = draft?.units || [];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      {/* Table Header */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        <div className="p-4 text-sm font-medium text-gray-700 border-r border-gray-200">
          Select
        </div>
        <div className="p-4 min-w-0 text-sm font-medium text-gray-700 border-r border-gray-200">
          Description
        </div>
        <div className="p-4 text-sm font-medium text-gray-700 border-r border-gray-200">
          Unit
        </div>
        <div className="p-4 text-sm font-medium text-left text-gray-700 border-r border-gray-200">
          Type
        </div>
        <div className="p-4 text-sm font-medium text-center text-gray-700 border-r border-gray-200">
          Month
        </div>
        <div className="p-4 text-sm font-medium text-right text-gray-700 border-r border-gray-200">
          Amount
        </div>
        <div className="p-4 text-sm font-medium text-right text-gray-700">
          Total
        </div>
      </div>
      {/* Table Rows Grouped by Unit */}
      <div className="bg-white">
        {units.map((unit: any) => {
          const unitTotal = getUnitTotal(unit, selectedItems, editingPrices);
          const unitItemKeys = unit.items.map((item: any) => getItemKey(item, unit.unitId));
          const selectedInUnit = unitItemKeys.filter((key: string) => selectedItems.has(key));
          const allSelectedInUnit = selectedInUnit.length === unitItemKeys.length;
          const someSelectedInUnit = selectedInUnit.length > 0 && selectedInUnit.length < unitItemKeys.length;
          
          return (
            <div key={unit.unitId} className="mb-2">
              {/* Unit Header */}
              <div className="flex items-center px-3 py-2 font-medium text-gray-700 bg-gray-50 border-b border-gray-200">
                                  <div className="flex gap-2 items-center">
                    <Checkbox
                      checked={allSelectedInUnit}
                      onCheckedChange={(checked) => handleSelectAllInUnit(unit, checked as boolean)}
                      className="mr-2"
                    />
                    <span className="text-sm">{getUnitAncestors(unit.unitName)}</span>
                  </div>
                {/* Always show total in header */}
                <span className="ml-auto text-sm font-medium text-gray-900">
                  {displayCurrency} {unitTotal}
                </span>
              </div>
              {/* Items for this unit */}
              <>
                {unit.items.map((item: any, idx: number) => {
                  const key = getItemKey(item, unit.unitId);
                  console.log("=> ", item.type);
                  const isVariable = item.type.toUpperCase() === "VARIABLE";
                  const isPercentage = item.type.toUpperCase() === "PERCENTAGE";
                  const isFixed = item.type.toUpperCase() === "FIXED";
                  const isInstallment = item.type.toUpperCase() === "INSTALLMENT";
                  const priceValue = isVariable
                    ? editingPrices[key] ?? item.price?.toString() ?? ""
                    : "";

                  // Display quantity (default to 1 if not set)
                  const displayQuantity = Math.floor(item.quantity || 1);

                  // Display amount (single item price)
                  const displayAmount = Number(item.amount) || 0;

                  // Display total (amount × quantity)
                  const displayTotal = isVariable
                    ? Number(editingPrices[key] || item.price || 0)
                    : Number(item.price) || Number(displayAmount) * Number(displayQuantity);

                  return (
                    <div
                      key={key}
                      className="grid grid-cols-7 border-b border-gray-100 last:border-b-0"
                    >
                      {/* Checkbox column */}
                      <div className="flex justify-center items-center p-3 border-r border-gray-100">
                        <Checkbox
                          checked={selectedItems.has(key)}
                          onCheckedChange={(checked) => handleItemSelection(key, checked as boolean)}
                          disabled={item.type === "DEPOSIT" || item.type === "RENT"}
                        />
                      </div>
                      {/* Description column */}
                      <div className="flex items-center p-3 min-w-0 text-sm text-gray-900 border-r border-gray-100">
                        <div className="w-full break-words">
                          {item.description}
                        </div>
                      </div>
                      {/* Unit column */}
                      <div className="flex items-center p-3 text-xs text-gray-700 border-r border-gray-100">
                        {item.node_name}
                      </div>
                      {/* Type column */}
                      <div className="flex items-center p-3 text-xs text-gray-700 border-r border-gray-100">
                        {item.type
                          .replace("_", " ")
                          .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </div>
                      {/* Quantity column */}
                      <div className="relative border-r border-gray-100">
                        {isVariable ? (
                          <div className="flex justify-center items-center p-3 h-full">
                            <span className="text-xs font-medium text-gray-900">
                              {displayQuantity}
                            </span>
                          </div>
                        ) : item.type === "DEPOSIT" ||
                          item.type === "PENALTY" ||
                          item.type === "RENT" ||
                          isInstallment ? (
                          <div className="flex justify-center items-center p-3 h-full">
                            <span className="text-xs font-medium text-gray-900">
                              {item.type === "DEPOSIT" ? 1 : displayQuantity}
                            </span>
                          </div>
                        ) : (
                          <div className="relative h-full">
                            <Input
                              type="number"
                              min="1"
                              value={Math.floor(displayQuantity)}
                              className="absolute inset-0 w-full h-full text-xs text-left bg-gray-50 rounded-none border-0 shadow-none focus:ring-0 hover:bg-gray-100"
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  handleQuantityChange(unit.unitId, item, 1);
                                } else {
                                  const parsed = parseInt(value);
                                  if (!isNaN(parsed) && parsed >= 1) {
                                    handleQuantityChange(
                                      unit.unitId,
                                      item,
                                      parsed
                                    );
                                  }
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {/* Amount column (single item price) */}
                      <div className="relative border-r border-gray-100">
                        {isVariable ? (
                          <div className="relative h-full">
                            <Input
                              type="number"
                              value={priceValue}
                              className="absolute inset-0 w-full h-full text-xs text-left bg-gray-50 rounded-none border-0 shadow-none focus:ring-0 hover:bg-gray-100"
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  handleVariablePriceChange(
                                    unit.unitId,
                                    item,
                                    0
                                  );
                                } else {
                                  const parsed = parseFloat(value);
                                  if (!isNaN(parsed) && parsed >= 0) {
                                    handleVariablePriceChange(
                                      unit.unitId,
                                      item,
                                      parsed
                                    );
                                  }
                                }
                              }}
                            />
                          </div>
                        ) : isPercentage ? (
                          <div className="flex justify-end items-center p-3 h-full">
                            <span className="text-xs font-semibold text-blue-700">
                              {item.percentage_rate}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex justify-end items-center p-3 h-full">
                            <span className="text-xs font-medium text-gray-900">
                              {displayCurrency} {displayAmount}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Total column (amount × quantity) */}
                      <div className="flex justify-end items-center p-3 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {displayCurrency} {displayTotal}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            </div>
          );
        })}
      </div>
      {/* TODO: Add notes and summary here if needed */}
    </div>
  );
};

export default TenantItemsTab;
