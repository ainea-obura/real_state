"use client";

import { AlertTriangle, Calendar, DollarSign, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { fetchTenantUnitItems } from '@/actions/finance/invoice';
import { createPenalty, searchPenaltyTenants } from '@/actions/finance/penalties';
import { getCurrencyDropdown } from '@/actions/projects';
import { Button } from '@/components/ui/button';
import DatePicker from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface AddPenaltyModalProps {
  open: boolean;
  onClose: () => void;
}

// Types for tenant search
interface PropertyInfo {
  property_tenant_id: string;
  unit: string;
  project_name: string;
  rent_amount: number;
  currency: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
}

interface TenantSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  property_info: PropertyInfo[];
  outstanding_balance: number;
}

interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
}

// Zod schema for form validation
const penaltyFormSchema = z.object({
  tenant_id: z.string().min(1, "Tenant is required"),
  property_tenant_id: z.string().min(1, "Property is required"),
  penalty_type: z.enum([
    "late_payment",
    "returned_payment",
    "lease_violation",
    "utility_overcharge",
    "other",
  ]),
  amount: z
    .number()
    .min(0.01, "Amount must be greater than 0")
    .or(z.literal(0)),
  currency: z.string().min(1, "Currency is required"),
  due_date: z.date().min(new Date(), "Due date must be in the future"),
  notes: z.string().optional(),
  tenant_notes: z.string().optional(),
});

type PenaltyFormValues = z.infer<typeof penaltyFormSchema>;

// Mock API function for tenant search - replace with actual API call

const AddPenaltyModal = ({ open, onClose }: AddPenaltyModalProps) => {
  const [selectedTenant, setSelectedTenant] =
    useState<TenantSearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<TenantSearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch currencies
  const { data: currencies, isLoading: isLoadingCurrencies } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const response = await getCurrencyDropdown();

      if (response.error) {
        return [];
      }

      return response.data;
    },
  });

  // Create penalty mutation
  const createPenaltyMutation = useMutation({
    mutationFn: createPenalty,
    onSuccess: () => {
      // Invalidate and refetch penalties list and stats
      queryClient.invalidateQueries({ queryKey: ["penalties-list"] });
      queryClient.invalidateQueries({ queryKey: ["penalties-stats"] });
      onClose();
      // Reset form
      form.reset();
      setSelectedTenant(null);
      setSearchQuery("");
      toast.success("Penalty created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create penalty");

      // You might want to show a toast notification here
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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { data: searchResultsData } = useQuery({
    queryKey: ["searchPenaltyTenants", searchQuery],
    queryFn: () => searchPenaltyTenants(searchQuery),
    enabled: searchQuery.length >= 3,
  });

  const { data: propertyTenants } = useQuery({
    queryKey: ["propertyTenants"],
    queryFn: () => fetchTenantUnitItems(selectedTenant?.id || "", false),
    enabled: !!selectedTenant?.id,
  });

  useEffect(() => {
    if (searchResultsData) {
      setSearchResults(searchResultsData.data?.results || []);
      setShowSearchResults(true);
    }
  }, [searchResultsData]);

  // Form setup
  const form = useForm<PenaltyFormValues>({
    resolver: zodResolver(penaltyFormSchema),
    defaultValues: {
      tenant_id: "",
      property_tenant_id: "",
      penalty_type: "late_payment",
      amount: 0,
      currency: "",
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: "",
      tenant_notes: "",
    },
  });

  const handleTenantSelect = (tenant: TenantSearchResult) => {
    setSelectedTenant(tenant);
    setSearchQuery(tenant.name);
    setShowSearchResults(false);

    // Set tenant_id in form
    form.setValue("tenant_id", tenant.id);
  };

  const onSubmit = async (data: PenaltyFormValues) => {
    try {
      // Convert due_date to YYYY-MM-DD format for backend
      const penaltyData = {
        ...data,
        due_date: new Date(data.due_date),
      };
      createPenaltyMutation.mutate(penaltyData);
    } catch (error) {}
  };

  const getTypeDescription = (type: string) => {
    switch (type) {
      case "late_payment":
        return "Fee applied when rent payment is received after the due date";
      case "returned_payment":
        return "Fee for bounced checks or failed payment attempts";
      case "lease_violation":
        return "Fee for violations of lease terms and conditions";
      case "utility_overcharge":
        return "Fee for excessive utility usage beyond normal limits";
      default:
        return "Custom penalty for specific circumstances";
    }
  };

  let availableCurrencies: Currency[] = [];
  if (!isLoadingCurrencies && currencies) {
    availableCurrencies = currencies.data || [];
  }

  const handleClose = () => {
    // Reset form
    form.reset();
    setSelectedTenant(null);
    setSearchQuery("");
    setShowSearchResults(false);
    setSearchResults([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="min-w-4xl max-h-[calc(100vh-150px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Penalty
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tenant Selection */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex justify-center items-center bg-blue-100 rounded-lg w-8 h-8">
                  <Search className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Select Tenant</h3>
                  <p className="text-gray-600 text-sm">
                    Choose the tenant to apply the penalty to
                  </p>
                </div>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="font-medium text-gray-700 text-sm">
                    Search Tenant
                  </Label>
                  <div className="relative" ref={searchRef}>
                    <Input
                      type="text"
                      placeholder="Search tenants by name, email, or phone (min 3 characters)..."
                      value={searchQuery || ""}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      className="bg-white border-gray-200"
                    />
                    {showSearchResults &&
                      searchQuery?.length >= 3 &&
                      !selectedTenant && (
                        <div className="z-10 absolute bg-white shadow-lg mt-1 border border-gray-200 rounded-lg w-full max-h-60 overflow-y-auto">
                          {searchResults.length === 0 ? (
                            <div className="p-3 text-gray-500 text-center">
                              No tenants found
                            </div>
                          ) : (
                            searchResults.map((tenant) => (
                              <div
                                key={tenant.id}
                                className="hover:bg-gray-50 p-3 border-gray-100 border-b last:border-b-0 cursor-pointer"
                                onClick={() => handleTenantSelect(tenant)}
                              >
                                <div className="font-medium text-gray-900">
                                  {tenant.name}
                                </div>
                                <div className="text-gray-500 text-sm">
                                  {tenant.email} • {tenant.phone}
                                </div>
                                {tenant.outstanding_balance > 0 && (
                                  <div className="font-medium text-red-600 text-sm">
                                    Outstanding: ${tenant.outstanding_balance}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                  </div>

                  {selectedTenant && (
                    <div className="bg-white p-4 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {selectedTenant.name}
                          </div>
                          <div className="text-gray-500 text-sm">
                            {selectedTenant.email} • {selectedTenant.phone}
                          </div>
                          {selectedTenant.outstanding_balance > 0 && (
                            <div className="mt-1 font-medium text-red-600 text-sm">
                              Outstanding: {selectedTenant.outstanding_balance}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTenant(null);
                            setSearchQuery("");
                            form.setValue("tenant_id", "");
                            form.setValue("property_tenant_id", "");
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="property_tenant_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-gray-700 text-sm">
                          Select Property *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!selectedTenant}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-200 w-full !h-11">
                              <SelectValue placeholder={"Seelect tenant"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {propertyTenants?.results.map((tenant) => (
                              <SelectItem
                                key={tenant.unit_id}
                                value={tenant.unit_id}
                              >
                                {tenant.unit_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Penalty Details */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border border-red-100 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex justify-center items-center bg-red-100 rounded-lg w-8 h-8">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Penalty Details
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Configure the penalty type and amount
                  </p>
                </div>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="penalty_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700 text-sm">
                        Penalty Type *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white border-gray-200 w-full !h-11">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="late_payment">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Late Payment Fee
                            </div>
                          </SelectItem>
                          <SelectItem value="returned_payment">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              Returned Payment Fee
                            </div>
                          </SelectItem>
                          <SelectItem value="lease_violation">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Lease Violation Fee
                            </div>
                          </SelectItem>
                          <SelectItem value="utility_overcharge">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              Utility Overcharge
                            </div>
                          </SelectItem>
                          <SelectItem value="other">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              Other
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-gray-500 text-xs">
                        {getTypeDescription(field.value)}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700 text-sm">
                        Amount *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="bg-white border-gray-200"
                          placeholder="50.00"
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              field.onChange(0);
                            } else {
                              const parsed = parseFloat(value);
                              if (!isNaN(parsed) && parsed >= 0) {
                                field.onChange(parsed);
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <div className="h-[30px]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700 text-sm">
                        Currency *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger
                            className="bg-white border-gray-200 w-full !h-11"
                            disabled={
                              isLoadingCurrencies ||
                              availableCurrencies.length === 0
                            }
                          >
                            <SelectValue
                              placeholder={
                                isLoadingCurrencies
                                  ? "Loading currencies..."
                                  : "Select currency"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingCurrencies ? (
                            <div className="p-2 text-gray-500 text-sm text-center">
                              Loading currencies...
                            </div>
                          ) : availableCurrencies.length === 0 ? (
                            <div className="p-2 text-gray-500 text-sm text-center">
                              No currencies available
                            </div>
                          ) : (
                            availableCurrencies.map((currency) => (
                              <SelectItem key={currency.id} value={currency.id}>
                                {currency.name} ({currency.code})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <div className="h-[30px]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Dates and Notes */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border border-green-100 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex justify-center items-center bg-green-100 rounded-lg w-8 h-8">
                  <Calendar className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Important Dates & Notes
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Set when the penalty is due and add any notes
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700 text-sm">
                        Due Date *
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          value={
                            field.value instanceof Date
                              ? field.value
                              : new Date(field.value)
                          }
                          onChange={(date) => {
                            field.onChange(date ?? new Date());
                          }}
                          minDate={new Date()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-gray-700 text-sm">
                          Internal Notes (Optional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Internal notes about this penalty (not visible to tenant)..."
                            className="bg-white border-gray-200 h-40 resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tenant_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-gray-700 text-sm">
                          Tenant Notes (Optional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes visible to the tenant..."
                            className="bg-white border-gray-200 h-40 resize-none"
                            rows={10}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPenaltyMutation.isPending}>
                {createPenaltyMutation.isPending ? "Adding..." : "Add Penalty"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPenaltyModal;
