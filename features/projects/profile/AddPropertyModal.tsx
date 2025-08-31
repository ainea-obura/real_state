"use client";

import { Alert02Icon } from 'hugeicons-react';
import { Building2, CheckCheck, MapPin, Pencil, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PropertyDetail, PropertyDetailSchema } from '@/schema/projects/schema';
import { zodResolver } from '@hookform/resolvers/zod';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (data: PropertyDetail) => Promise<void>;
  onSubmit: (data: PropertyDetail) => Promise<void>;
  editData?: PropertyDetail | null;
}

// Property types with labels for display
const PROPERTY_TYPES = [
  { value: "APT", label: "Apartment" },
  { value: "COLD", label: "Cold Storage" },
  { value: "CONDO", label: "Condominium" },
  { value: "MALL", label: "Mall" },
  { value: "OFFICE", label: "Office Building" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "RETAIL", label: "Retail Store" },
  { value: "VILLA", label: "Villa" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "OTHER", label: "Other" },
] as const;

export function AddPropertyModal({
  isOpen,
  onClose,
  onSubmit,
  onEdit,
  editData,
}: AddPropertyModalProps) {
  const defaultValues = {
    id: null,
    name: "",
    property_type: "APT",
    size: "",
    description: "",
    latitude: null,
    longitude: null,
    total_units: 0,
    total_floors: 0,
    total_rooms: 0,
  };

  const form = useForm<PropertyDetail>({
    resolver: zodResolver(PropertyDetailSchema),
    defaultValues,
  });

  // Reset form when modal closes or editData changes
  useEffect(() => {
    if (!isOpen) {
      // When modal closes, reset to default values
      form.reset(defaultValues);
    } else if (editData) {
      // When in edit mode, set edit data
      form.reset(editData);
    } else {
      // When in create mode, reset to default values
      form.reset(defaultValues);
    }
  }, [isOpen, editData, form]);

  const handleSubmit = async (data: PropertyDetail) => {
    if (editData) {
      await onEdit(data);
    } else {
      await onSubmit(data);
    }
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col gap-0 mt-10 p-0 max-w-[800px] h-[85vh]">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 border-b border-border/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              <div className="flex gap-2 items-center">
                <Plus className="w-5 h-5 text-primary" />
                {editData ? "Edit Property" : "Add New Property"}
              </div>
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-muted-foreground">
              Fill in the property details below. All fields marked with * are
              required.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <Form {...form}>
            <form
              id="propertyForm"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-8"
            >
              {/* Basic Information */}
              <div className="space-y-6">
                <h3 className="flex gap-2 items-center pb-2 text-lg font-medium border-b">
                  <Building2 className="w-5 h-5 text-primary" />
                  Basic Information
                </h3>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">
                          Property Name *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter property name"
                            className="!h-11"
                            {...field}
                          />
                        </FormControl>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="property_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">
                            Property Type *
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full !h-11">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PROPERTY_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="h-[18px]">
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">
                            Size (m²) *
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., 120"
                              className="!h-11"
                              {...field}
                            />
                          </FormControl>
                          <div className="h-[18px]">
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter property description"
                          className="h-24 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <div className="h-[18px]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Location Information */}
              <div className="space-y-6">
                <h3 className="flex gap-2 items-center pb-2 text-lg font-medium border-b">
                  <MapPin className="w-5 h-5 text-primary" />
                  Location Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel className="text-base">Latitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., -1.2809"
                            className="!h-11"
                            {...field}
                            value={value || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onChange(val ? parseFloat(val) : null);
                            }}
                          />
                        </FormControl>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel className="text-base">Longitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 36.8207"
                            className="!h-11"
                            {...field}
                            value={value || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onChange(val ? parseFloat(val) : null);
                            }}
                          />
                        </FormControl>
                        <div className="h-[18px]">
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 border-t border-border/20">
          <div className="flex gap-4 justify-end items-center">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-6"
            >
              Cancel
            </Button>
            <Button type="submit" form="propertyForm" className="px-6">
              {editData ? (
                <>
                  <Pencil className="mr-2 w-4 h-4" />
                  Update Property
                </>
              ) : (
                <>
                  <Plus className="mr-2 w-4 h-4" />
                  Create Property
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
