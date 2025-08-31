import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import z from 'zod';

import { getCurrencyDropdown } from '@/actions/projects';
import { createUnitStructure, editUnitStructure } from '@/actions/projects/structure';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQuery } from '@tanstack/react-query';

import { StructureApiResponse } from '../schema/projectStructureSchema';
import { unitSchemaStructure } from '../schema/unitSchemaStructure';

// Helper function to extract numeric value from formatted currency string
const extractNumericValue = (
  value: string | number | null | undefined
): number => {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }

  if (typeof value === "string") {
    // Remove currency symbols, spaces, and commas, then parse
    const cleaned = value.replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

// Type for floor data
interface Floor {
  id: string;
  name: string;
  number: number;
}

interface UnitModelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string; // made required
  blockId: string;
  floors?: Floor[];
  onUnitCreated?: (
    newStructure?: StructureApiResponse["data"]["results"]
  ) => void;
  onCancel?: () => void; // Callback to close parent modal
  editMode?: boolean;
  initialValues?: any;
}

const UnitModel = ({
  isOpen,
  onClose,
  blockId,
  projectId,
  floors = [],
  onUnitCreated,
  onCancel,
  editMode = false,
  initialValues,
}: UnitModelProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof unitSchemaStructure>>({
    defaultValues: initialValues || {
      floor: "",
      block: blockId,
      apartment: {
        management_mode: "FULL_MANAGEMENT",
        management_status: "for_rent",
        status: "available",
        identifier: "",
        size: "",
        rental_price: undefined,
        sale_price: undefined,
        service_charge: undefined,
        description: "",
        currency: "",
        unit_type: undefined,
      },
    },
  });

  useEffect(() => {
    if (editMode && initialValues) {
      form.reset(initialValues);
    }
  }, [editMode, initialValues]);

  // Watch management mode to conditionally show rental price
  const managementMode = form.watch("apartment.management_mode");
  const createUnitModel = useMutation({
    mutationFn: async (data: z.infer<typeof unitSchemaStructure>) => {
      const res = await createUnitStructure(data, projectId as string);
      if (res.error) {
        // Handle different error response types
        const errorMessage =
          "message" in res ? res.message : "Failed to create apartment";
        throw new Error(errorMessage);
      }
      return res;
    },
    onSuccess: (response) => {
      toast.success("Apartment created successfully");
      setIsLoading(false);

      // Clear only apartment fields, keep floor selection
      form.setValue("apartment.identifier", "");
      form.setValue("apartment.size", "");
      form.setValue("apartment.management_mode", "FULL_MANAGEMENT");
      form.setValue("apartment.management_status", "for_rent");
      form.setValue("apartment.status", "available");
      form.setValue("apartment.rental_price", undefined);
      form.setValue("apartment.sale_price", undefined);
      form.setValue("apartment.service_charge", undefined);
      form.setValue("apartment.description", "");
      form.setValue("apartment.currency", ""); // Clear currency on success
      form.setValue("apartment.unit_type", undefined);

      // Call onUnitCreated to update the cache/structure
      if (onUnitCreated) {
        if (response.data && "results" in response.data) {
          onUnitCreated(response.data.results);
        } else {
          onUnitCreated();
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create Apartment");
      setIsLoading(false);
    },
  });

  // Fetch currencies for dropdown
  const { data: currenciesResponse, isLoading: isLoadingCurrencies } = useQuery(
    {
      queryKey: ["currencies"],
      queryFn: async () => {
        const res = await getCurrencyDropdown();
        return res;
      },
    }
  );

  // Handle the actual response structure from the API
  const currencies = currenciesResponse?.data?.data;
  console.log(currencies);
  const onSubmit = async (data: z.infer<typeof unitSchemaStructure>) => {
    setIsLoading(true);
    if (editMode) {
      // Call real API for editing
      if (!projectId) {
        toast.error("Missing project or unit id");
        setIsLoading(false);
        return;
      }
      try {
        const res = await editUnitStructure(data, projectId, initialValues.id);
        if (res && !res.error) {
          toast.success("Apartment updated successfully");
          setIsLoading(false);
          onUnitCreated?.(res.data?.results);
          onClose();
        } else {
          toast.error(res?.message || "Failed to update apartment");
          setIsLoading(false);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to update apartment");
        setIsLoading(false);
      }
      return;
    }
    createUnitModel.mutate(data);
  };

  const handleCancel = () => {
    // Reset form to clear all data
    form.reset({
      floor: "",
      block: blockId,
      apartment: {
        management_mode: "SERVICE_ONLY",
        management_status: "for_rent",
        status: "available",
        identifier: "",
        size: "",
        rental_price: undefined,
        service_charge: undefined,
        description: "",
        currency: "", // Clear currency on cancel
        unit_type: undefined,
      },
    });
    // Close the unit modal
    onClose();
    // Close the parent stats modal
    onCancel?.();
  };

  // Handle modal close to update structure
  const handleModalClose = () => {
    // Only trigger structure update if we're not in edit mode
    if (!editMode) {
      onUnitCreated?.();
    }
    onClose();
  };

  console.log(initialValues);

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="mt-10 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Unit" : "Add Unit"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Hidden inputs for parent relationships */}
            <input type="hidden" {...form.register("block")} />
            <div className="gap-4 grid grid-cols-2">
              {/* Floor Selection */}
              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Floor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full !h-11">
                          <SelectValue placeholder="Select a floor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {floors.map((floor) => (
                          <SelectItem key={floor.id} value={floor.id}>
                            {floor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Identifier */}
              <FormField
                control={form.control}
                name="apartment.identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apartment Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., A101, B205" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Size */}
              <FormField
                control={form.control}
                name="apartment.size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size in sqm *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 120" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Management Mode */}
              <FormField
                control={form.control}
                name="apartment.management_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Management Mode *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Clear rental_price and currency when switching to SERVICE_ONLY
                        if (value === "SERVICE_ONLY") {
                          form.setValue("apartment.rental_price", undefined);
                          form.setValue("apartment.currency", "");
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full !h-11">
                          <SelectValue placeholder="Select management mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SERVICE_ONLY">
                          Service Only
                        </SelectItem>
                        <SelectItem value="FULL_MANAGEMENT">
                          Full Management
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency Dropdown - Only for FULL_MANAGEMENT */}
              {managementMode === "FULL_MANAGEMENT" && (
                <FormField
                  control={form.control}
                  name="apartment.currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingCurrencies}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full !h-11 overflow-hidden text-ellipsis whitespace-nowrap">
                            <SelectValue
                              placeholder={
                                isLoadingCurrencies
                                  ? "Loading..."
                                  : "Select currency"
                              }
                              className="overflow-hidden text-ellipsis whitespace-nowrap"
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(currencies) && currencies.length > 0
                            ? currencies.map((currency) => (
                                <SelectItem
                                  key={currency.id}
                                  value={currency.id}
                                  className="overflow-hidden text-ellipsis whitespace-nowrap"
                                >
                                  {currency.name} ({currency.code})
                                </SelectItem>
                              ))
                            : null}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Type Dropdown - Show for both modes */}
              <FormField
                control={form.control}
                name="apartment.unit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full !h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1 Bedroom">1 Bedroom</SelectItem>
                        <SelectItem value="2 Bedroom">2 Bedroom</SelectItem>
                        <SelectItem value="3 Bedroom">3 Bedroom</SelectItem>
                        <SelectItem value="4 Bedroom">4 Bedroom</SelectItem>
                        <SelectItem value="5 Bedroom">5 Bedroom</SelectItem>
                        <SelectItem value="6 Bedroom">6 Bedroom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Rental Price - Only show for FULL_MANAGEMENT */}
              {managementMode === "FULL_MANAGEMENT" && (
                <div className="gap-4 grid grid-cols-2 col-span-2">
                  <FormField
                    control={form.control}
                    name="apartment.management_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Management Status *</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Clear service_charge when switching to "for_sale"
                            if (value === "for_sale") {
                              form.setValue(
                                "apartment.service_charge",
                                undefined
                              );
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full !h-11">
                              <SelectValue placeholder="Select management status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="for_rent">For Rent</SelectItem>
                            <SelectItem value="for_sale">For Sale</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apartment.rental_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch("apartment.management_status") ===
                          "for_sale"
                            ? "Sales Price"
                            : "Rental Price *"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={
                              form.watch("apartment.management_status") ===
                              "for_sale"
                                ? "e.g., 50000"
                                : "e.g., 1500"
                            }
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value
                                ? Number(e.target.value)
                                : undefined;
                              field.onChange(value);

                              // If it's for sale, also update sales_price field
                              if (
                                form.watch("apartment.management_status") ===
                                "for_sale"
                              ) {
                                form.setValue("apartment.sale_price", value);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Unit Status and Service Charge - Show service charge only for rent */}
              <div className="gap-4 grid grid-cols-2 col-span-2">
                <FormField
                  control={form.control}
                  name="apartment.status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Status *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full !h-11">
                            <SelectValue placeholder="Select unit status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="rented">Rented</SelectItem>
                          {managementMode === "SERVICE_ONLY" && (
                            <SelectItem value="accupied_by_owner">
                              Accupied By the owner
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Show Service Charge only for rent */}
                {form.watch("apartment.management_status") === "for_rent" && (
                  <FormField
                    control={form.control}
                    name="apartment.service_charge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Charge</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 200"
                            value={
                              typeof field.value === "string" &&
                              field.value.includes(" ")
                                ? field.value.split(" ")[1]
                                : String(field.value || "")
                            }
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? e.target.value : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Description */}
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="apartment.description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter unit description..."
                          className="h-24 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? editMode
                    ? "Updating..."
                    : "Saving..."
                  : editMode
                  ? "Update"
                  : "Save & Add Another"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UnitModel;
