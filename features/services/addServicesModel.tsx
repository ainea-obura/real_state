"use client";

import { Calculator, Percent, Plus, TrendingUp } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { getCurrencyDropdown } from '@/actions/projects';
import { createService, updateService } from '@/actions/services';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { serviceFormSchema, ServiceFormValues, ServiceResponse } from './schema/serviceSchema';

type ServiceFormData = ServiceFormValues;

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceFormData) => void;
  editMode?: boolean;
  serviceData?: ServiceResponse;
}

const AddServiceModal = ({
  isOpen,
  onClose,
  onSubmit,
  editMode = false,
  serviceData,
}: AddServiceModalProps) => {
  const queryClient = useQueryClient();

  // Create service mutation
  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: async (result) => {
      if (result.isError) {
        toast.error(result.message || "Failed to create service");
      } else {
        // Immediately update cache with new data and then refetch to ensure consistency
        queryClient.setQueryData(["services"], result);
        await queryClient.invalidateQueries({ queryKey: ["services"] });

        toast.success(result.message || "Service created successfully!");
        form.reset();
        onClose();
        onSubmit(result.data.results[0] as ServiceFormData);
      }
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });

      toast.error("An unexpected error occurred. Please try again.");
    },
  });

  // Update service mutation
  const updateMutation = useMutation({
    mutationFn: ({
      data,
      serviceId,
    }: {
      data: ServiceFormData;
      serviceId: string;
    }) => updateService(data, serviceId),
    onSuccess: async (result) => {
      if (result.isError) {
        toast.error(result.message || "Failed to update service");
      } else {
        // Immediately update cache with new data and then refetch to ensure consistency
        queryClient.setQueryData(["services"], result);
        await queryClient.invalidateQueries({ queryKey: ["services"] });

        toast.success(result.message || "Service updated successfully!");
        onClose();
        onSubmit(result.data.results[0] as ServiceFormData);
      }
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });

      toast.error("An unexpected error occurred. Please try again.");
    },
  });

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      pricing_type: "FIXED",
      base_price: "",
      percentage_rate: "",
      currency: "KES",
      frequency: "ONE_TIME",
      billed_to: "TENANT",
    },
  });

  // Add this inside the component:
  const { data: currenciesResponse, isLoading: isLoadingCurrencies } = useQuery(
    {
      queryKey: ["currencies"],
      queryFn: getCurrencyDropdown,
    }
  );

  console.log("a.", currenciesResponse);

  type Currency = {
    id: string;
    code: string;
    name: string;
    symbol: string;
  };
  const currencies: Currency[] =
    currenciesResponse?.data.data && Array.isArray(currenciesResponse.data.data)
      ? currenciesResponse.data.data
      : [];
  console.log("b.", currencies);

  // Reset form with service data when in edit mode
  useEffect(() => {
    if (editMode && serviceData && isOpen) {
      form.reset({
        name: serviceData.name,
        description: serviceData.description,
        pricing_type: serviceData.pricing_type,
        base_price: serviceData.base_price || "",
        percentage_rate: serviceData.percentage_rate || "",
        currency: serviceData.currency,
        frequency: serviceData.frequency as
          | "ONE_TIME"
          | "DAILY"
          | "WEEKLY"
          | "MONTHLY"
          | "QUARTERLY"
          | "YEARLY",
        billed_to: serviceData.billed_to,
      });
    } else if (!editMode && isOpen) {
      // Reset to default values for create mode
      form.reset({
        name: "",
        description: "",
        pricing_type: "FIXED",
        base_price: "",
        percentage_rate: "",
        currency: "USD",
        frequency: "ONE_TIME",
        billed_to: "TENANT",
      });
    }
  }, [editMode, serviceData, isOpen, form]);

  const watchedPricingType = form.watch("pricing_type");

  const handleSubmit = async (data: ServiceFormData) => {
    let payload = { ...data };
    if (payload.pricing_type === "VARIABLE") {
      // Remove currency for variable services
      delete payload.currency;
    }
    if (editMode && serviceData) {
      updateMutation.mutate({ data: payload, serviceId: serviceData.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col sm:max-w-[600px] h-full max-h-[calc(100vh-150px)] overflow-hidden">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-bold">
                {editMode ? "Edit Service" : "Add New Service"}
              </DialogTitle>
              <DialogDescription>
                {editMode
                  ? "Update service details and pricing configuration"
                  : "Create a new service with pricing and billing configuration"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="overflow-y-auto flex-1 p-6 space-y-6"
          >
            {/* Basic Information */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter service name" {...field} />
                    </FormControl>
                    <div className="h-5">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the service..."
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description of the service
                    </FormDescription>
                    <div className="h-5">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing Configuration */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="pricing_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing Type *</FormLabel>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div
                        className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-md ${
                          field.value === "FIXED"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/60 hover:bg-muted/30"
                        }`}
                        onClick={() => field.onChange("FIXED")}
                      >
                        <div className="flex flex-col gap-3 items-center text-center">
                          <div
                            className={`p-3 rounded-full transition-all duration-300 ${
                              field.value === "FIXED"
                                ? "bg-primary text-primary-foreground shadow-lg"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            <Calculator className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="mb-1 text-base font-bold">
                              Fixed Price
                            </h4>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              Set a fixed amount for the service
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-md ${
                          field.value === "PERCENTAGE"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/60 hover:bg-muted/30"
                        }`}
                        onClick={() => field.onChange("PERCENTAGE")}
                      >
                        <div className="flex flex-col gap-3 items-center text-center">
                          <div
                            className={`p-3 rounded-full transition-all duration-300 ${
                              field.value === "PERCENTAGE"
                                ? "bg-primary text-primary-foreground shadow-lg"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            <Percent className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="mb-1 text-base font-bold">
                              Percentage
                            </h4>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              Based on percentage rate
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-md ${
                          field.value === "VARIABLE"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/60 hover:bg-muted/30"
                        }`}
                        onClick={() => field.onChange("VARIABLE")}
                      >
                        <div className="flex flex-col gap-3 items-center text-center">
                          <div
                            className={`p-3 rounded-full transition-all duration-300 ${
                              field.value === "VARIABLE"
                                ? "bg-primary text-primary-foreground shadow-lg"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            <TrendingUp className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="mb-1 text-base font-bold">
                              Variable
                            </h4>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              Dynamic pricing based on usage
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="h-5">
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Conditional Pricing Fields */}
              {watchedPricingType === "FIXED" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full !h-11">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencies?.map((currency: Currency) => (
                              <SelectItem key={currency.id} value={currency.id}>
                                {currency.name} ({currency.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="h-5">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="base_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="pl-12"
                              {...field}
                            />
                          </div>
                        </FormControl>

                        <div className="h-5">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {watchedPricingType === "PERCENTAGE" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="percentage_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentage Rate *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0.00"
                              {...field}
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                              %
                            </span>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Percentage rate applied to the base amount
                        </FormDescription>
                        <div className="h-5">
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
                        <FormLabel>Currency *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full !h-11">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencies?.map((currency: Currency) => (
                              <SelectItem key={currency.id} value={currency.id}>
                                {currency.name} - {currency.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="h-5">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {watchedPricingType === "VARIABLE" && (
                <div className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex gap-2 items-center mb-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Variable Pricing
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Variable services don&apos;t require a fixed price. Pricing
                    will be determined based on usage, consumption, or other
                    factors when the service is assigned to properties.
                  </p>
                </div>
              )}
            </div>

            {/* Billing Configuration */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Frequency *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full !h-11">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ONE_TIME">One Time</SelectItem>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="h-5">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billed_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billed To *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full !h-11">
                            <SelectValue placeholder="Select billing target" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TENANT">Tenant</SelectItem>
                          <SelectItem value="OWNER">Owner</SelectItem>
                          <SelectItem value="MANAGEMENT">Management</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="h-5">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>

        {/* Form Actions - Fixed at Bottom */}
        <div className="flex gap-3 justify-end items-center p-6 border-t bg-background">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={onClose}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="h-11"
            onClick={form.handleSubmit(handleSubmit)}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <div className="flex gap-2 items-center">
                <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                {editMode ? "Updating..." : "Creating..."}
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <Plus className="w-4 h-4" />
                {editMode ? "Update Service" : "Create Service"}
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddServiceModal;
