"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, DollarSign, User, Building, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { fetchPendingCommissions, createCommissionExpenses, Commission, CreateCommissionExpenseRequest } from "@/actions/finance/expense";

interface PayCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PayCommissionModal({
  isOpen,
  onClose,
  onSuccess,
}: PayCommissionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const queryClient = useQueryClient();

  // Fetch pending commissions from API
  const {
    data: commissions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["pending-commissions"],
    queryFn: fetchPendingCommissions,
    enabled: isOpen,
  });

  // Search and filtering logic
  const filteredCommissions = commissions?.filter(commission => {
    if (!searchQuery.trim()) return false; // Only show results when typing
    
    const query = searchQuery.toLowerCase();
    return (
      commission.recipient.first_name.toLowerCase().includes(query) ||
      commission.recipient.last_name.toLowerCase().includes(query) ||
      commission.recipient.phone.toLowerCase().includes(query) ||
      commission.recipient.email.toLowerCase().includes(query) ||
      commission.reference.toLowerCase().includes(query) ||
      commission.type.toLowerCase().includes(query) ||
      commission.amount.toLowerCase().includes(query) ||
      commission.currency.code.toLowerCase().includes(query)
    );
  }).filter(commission => !selectedCommissions.has(commission.id)) || []; // Exclude already selected

  const selectedCount = selectedCommissions.size;
  const totalAmount = Array.from(selectedCommissions).reduce((total, commissionId) => {
    const commission = commissions?.find(c => c.id === commissionId);
    return total + (commission ? parseFloat(commission.amount) : 0);
  }, 0);

  const handleCommissionSelection = (commissionId: string) => {
    const newSelected = new Set(selectedCommissions);
    newSelected.add(commissionId);
    setSelectedCommissions(newSelected);
    setSearchQuery(""); // Clear search
    setIsDropdownOpen(false); // Close dropdown
    setFocusedIndex(-1); // Reset focus
  };

  const handleCommissionRemoval = (commissionId: string) => {
    const newSelected = new Set(selectedCommissions);
    newSelected.delete(commissionId);
    setSelectedCommissions(newSelected);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen || filteredCommissions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredCommissions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommissions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredCommissions.length) {
          handleCommissionSelection(filteredCommissions[focusedIndex].id);
        }
        break;
      case "Escape":
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleBulkPayment = async () => {
    if (selectedCount === 0) return;

    setIsPaying(true);
    try {
      // Prepare commission data for the API
      const selectedCommissionData = Array.from(selectedCommissions).map(commissionId => {
        const commission = commissions?.find(c => c.id === commissionId);
        if (!commission) throw new Error(`Commission ${commissionId} not found`);
        
        return {
          id: commission.id,
          type: commission.type,
          amount: commission.amount,
          property_node_id: commission.property_node_id,
          commission_id: commission.commission_id,
        };
      });

      const request: CreateCommissionExpenseRequest = {
        commissions: selectedCommissionData,
        payment_method: paymentMethod,
        notes: `Bulk commission payment for ${selectedCount} commissions`,
      };

      // Call the API to create commission expenses
      const result = await createCommissionExpenses(request);
      
      toast.success(`Successfully created ${result.count} commission expenses (Total: ${result.total_amount} KES)`);
      
      // Refresh the commissions list
      queryClient.invalidateQueries({ queryKey: ["pending-commissions"] });
      
      setSelectedCommissions(new Set());
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process commission payments";
      toast.error(errorMessage);
      console.error("Commission payment error:", error);
    } finally {
      setIsPaying(false);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setIsDropdownOpen(false);
      setFocusedIndex(-1);
      setSelectedCommissions(new Set());
      setPaymentMethod("bank_transfer");
    }
  }, [isOpen]);

  if (isError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="!max-w-none w-[60vw] h-[80vh] mt-10 overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Error Loading Commissions
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 justify-center items-center">
            <div className="text-center text-gray-500">
              <div className="mb-2 text-lg font-medium">Failed to load commissions</div>
              <div className="mb-4 text-sm">{error?.message || "Unknown error occurred"}</div>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-none w-[60vw] h-[80vh] mt-10 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <DollarSign className="w-5 h-5 text-green-600" />
            Pay Commissions
          </DialogTitle>
        </DialogHeader>

        <div className="flex overflow-hidden flex-col flex-1 gap-4">
          {/* Search Area */}
          <div className="p-4 mb-4 bg-gray-50 rounded-lg">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, phone, email, commission type, amount, or property reference..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(e.target.value.trim().length > 0);
                  setFocusedIndex(-1);
                }}
                onFocus={() => {
                  if (searchQuery.trim().length > 0) {
                    setIsDropdownOpen(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              
              {/* Dropdown Results */}
              {isDropdownOpen && filteredCommissions.length > 0 && (
                <div className="overflow-y-auto absolute right-0 left-0 top-full z-50 mt-1 max-h-60 bg-white rounded-lg border border-gray-200 shadow-lg">
                  {filteredCommissions.map((commission, index) => (
                    <div
                      key={commission.id}
                      onClick={() => handleCommissionSelection(commission.id)}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                        index === focusedIndex ? "bg-gray-100" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {commission.recipient.first_name} {commission.recipient.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {commission.reference}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {commission.amount}
                          </div>
                          <div className="text-xs text-gray-500">{commission.currency.code}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-3 text-sm text-gray-600">
              {selectedCount > 0 ? (
                <span className="font-medium">{selectedCount}</span>
              ) : (
                <span>0</span>
              )} commission{selectedCount !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Selected Commissions Table */}
          {selectedCount > 0 && (
            <div className="flex overflow-hidden flex-col flex-1">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Selected Commissions ({selectedCount})
                </h3>
                <div className="text-lg font-semibold text-green-600">
                  Total: {totalAmount.toLocaleString()} KES
                </div>
              </div>
              
              <div className="overflow-y-auto flex-1 rounded-lg border border-gray-200">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase border-r border-gray-200">
                        Recipient
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase border-r border-gray-200">
                        Type
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase border-r border-gray-200">
                        Reference
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase border-r border-gray-200">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(selectedCommissions).map((commissionId) => {
                      const commission = commissions?.find(c => c.id === commissionId);
                      if (!commission) return null;
                      
                      return (
                        <tr key={commissionId} className="border-b border-gray-200">
                          <td className="px-4 py-3 border-r border-gray-200">
                            <div className="whitespace-nowrap">
                              <div className="font-medium text-gray-900">
                                {commission.recipient.first_name} {commission.recipient.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {commission.recipient.email}
                              </div>
                              <div className="text-xs text-gray-400">
                                {commission.recipient.phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200">
                            <div className="whitespace-nowrap">
                              <Badge variant={
                                commission.type === "sales" ? "default" : 
                                commission.type === "sales_person" ? "outline" : "secondary"
                              }>
                                {commission.type === "sales" ? "Sales Commission" : 
                                 commission.type === "sales_person" ? "Sales Person Commission" : 
                                 "Tenant Commission"}
                              </Badge>
                              {commission.type === "sales_person" && commission.commission_type && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {commission.commission_type === "percentage" ? 
                                   `${commission.commission_rate}%` : 
                                   `Fixed: ${commission.commission_rate}`}
                                  {commission.payment_setting && (
                                    <span className="ml-2 text-gray-400">
                                      ({commission.payment_setting.replace(/_/g, ' ')})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200">
                            <div className="text-sm text-gray-900 whitespace-nowrap">
                              {commission.reference}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right border-r border-gray-200">
                            <div className="whitespace-nowrap">
                              <div className="font-medium text-green-600">
                                {commission.amount}
                              </div>
                              <div className="text-xs text-gray-500">{commission.currency.code}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleCommissionRemoval(commissionId)}
                              className="p-1 text-red-600 rounded hover:text-red-800 hover:bg-red-50"
                              title="Remove commission"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {selectedCount === 0 && (
            <div className="flex flex-1 justify-center items-center">
              {isLoading ? (
                <div className="text-center text-gray-500">
                  <Loader2 className="mx-auto mb-3 w-12 h-12 text-gray-300 animate-spin" />
                  <div className="text-lg font-medium">Loading Commissions...</div>
                  <div className="text-sm">Please wait while we fetch pending commissions</div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <User className="mx-auto mb-3 w-12 h-12 text-gray-300" />
                  <div className="text-lg font-medium">No Commissions Selected</div>
                  <div className="text-sm">Search above to find and select commissions to pay</div>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selection */}
          {selectedCount > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="px-3 py-2 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isPaying}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
                <option value="airtel_money">Airtel Money</option>
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {selectedCount > 0 && (
                <>
                  <span className="font-medium">{selectedCount}</span> commissions selected • 
                  Total: <span className="font-medium text-green-600">{totalAmount.toLocaleString()} KES</span>
                </>
              )}
            </div>
            <div className="flex gap-3 items-center">
              <Button variant="outline" onClick={onClose} disabled={isPaying}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkPayment}
                disabled={selectedCount === 0 || isPaying}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPaying ? "Processing..." : `Pay ${selectedCount} Commission${selectedCount !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
