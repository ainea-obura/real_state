import { Building2, Loader2, Search, User, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { assignSalesPerson, searchOwners } from "@/actions/sales/loadProjects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Zod validation schema
const assignSalesPersonSchema = z.object({
  salesItemId: z.string().min(1, "Sales item ID is required"),
  staffId: z.string().min(1, "Please select a sales person"),
  commissionType: z.enum(["percentage", "fixed"]).default("percentage"),
  commissionAmount: z.string().min(1, "Please enter commission amount"),
  paymentSetting: z
    .enum(["per_payment", "per_project_completion"])
    .default("per_payment"),
  notes: z.string().optional(),
});

type AssignSalesPersonFormData = z.infer<typeof assignSalesPersonSchema>;

interface AssignSalesPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerProperty: {
    id?: string;
    ownerName?: string;
    propertyName?: string;
    assignedSalesPerson?: {
      name?: string;
    };
    status?: string;
  } | null;
}

const AssignSalesPersonModal: React.FC<AssignSalesPersonModalProps> = ({
  isOpen,
  onClose,
  ownerProperty,
}) => {
  // Separate input value from search term for better UX
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const queryClient = useQueryClient();

  const form = useForm<AssignSalesPersonFormData>({
    resolver: zodResolver(assignSalesPersonSchema),
    defaultValues: {
      salesItemId: ownerProperty?.id || "",
      staffId: "",
      commissionType: "percentage",
      commissionAmount: "",
      paymentSetting: "per_payment",
      notes: "",
    },
  });

  // Custom debounced search to prevent API spam
  const debouncedSearch = useCallback((searchTerm: string) => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      setSearchTerm(searchTerm);
    }, 500); // Wait 500ms after user stops typing
  }, []);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value); // Update input immediately

    // Clear selected sales person when user starts typing new search
    if (value && form.watch("staffId")) {
      form.setValue("staffId", "");
    }

    debouncedSearch(value); // Debounce API call
  };

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Set salesItemId when modal opens
  useEffect(() => {
    if (isOpen && ownerProperty?.id) {
      form.setValue("salesItemId", ownerProperty.id);
      console.log("Setting salesItemId to:", ownerProperty.id);
    }
  }, [isOpen, ownerProperty?.id, form]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Use useQuery to search staff (sales people)
  const { data: staffData, isLoading: isLoadingStaff } = useQuery({
    queryKey: ["searchStaff", searchTerm],
    queryFn: () => searchOwners({ q: searchTerm, type: "staff" }),
    enabled: !!searchTerm && searchTerm.length > 0 && !form.watch("staffId"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount
  });

  // Use useMutation for assigning sales person
  const assignSalesPersonMutation = useMutation({
    mutationFn: assignSalesPerson,
    onSuccess: (data) => {
      console.log("=== BACKEND RESPONSE ===");
      console.log("Full response:", data);
      console.log("Response type:", typeof data);
      console.log("Response keys:", Object.keys(data));
      console.log("========================");

      // Check if it's an error response
      if ("error" in data && data.error) {
        toast.error("Assignment Failed", {
          description: data.message,
          duration: 7000,
        });
        return;
      }

      // Check if it's a validation error response
      if ("errors" in data && data.errors) {
        const errorMessages = Object.values(data.errors).flat().join(", ");
        toast.error("Validation Failed", {
          description: errorMessages,
          duration: 7000,
        });
        return;
      }

      // Show success toast
      const successData = data as any;
      toast.success("Sales Person Assigned Successfully!", {
        description: `${successData.data.sales_person_name} has been assigned to the property with ${successData.data.commission_type} commission.`,
        duration: 5000,
      });

      // Invalidate the owner properties table query to refresh data
      queryClient.invalidateQueries({ queryKey: ["ownerProperties"] });

      // Close modal and reset form on success
      onClose();
      form.reset();
    },
    onError: (error) => {
      console.error("Failed to assign sales person:", error);

      // Show error toast with server message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to assign sales person";
      toast.error("Assignment Failed", {
        description: errorMessage,
        duration: 7000,
      });
    },
  });

  // Transform API staff data to local interface
  const salesPeople =
    staffData?.data?.results?.map((staff: any) => ({
      id: staff.id,
      name: staff.full_name,
      email: staff.email,
      phone: staff.phone,
      avatar: staff.avatar,
      position: staff.position_name,
      performance: staff.performance_metrics || {
        rating: 4.5, // Default rating
        propertiesSold: 0,
        activeContracts: 0,
        completionRate: 0,
      },
      specializations: ["Residential", "Commercial"], // Default specializations
      currentWorkload: staff.availability_status?.current_workload || 0,
      maxWorkload: staff.availability_status?.max_workload || 15,
      isAvailable: staff.availability_status?.is_available || false,
      isActive: staff.availability_status?.is_active || false,
    })) || [];

  const filteredSalesPeople = salesPeople.filter(
    (person) =>
      person.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      person.email.toLowerCase().includes(inputValue.toLowerCase())
  );

  const onSubmit = (data: AssignSalesPersonFormData) => {
    console.log("=== ASSIGN SALES PERSON FORM SUBMITTED ===");
    console.log("Form Data:", data);
    console.log("Sales Item ID:", data.salesItemId);
    console.log("Staff ID:", data.staffId);
    console.log("Commission Type:", data.commissionType);
    console.log("Commission Amount:", data.commissionAmount);
    console.log("Payment Setting:", data.paymentSetting);
    console.log("Notes:", data.notes);
    console.log("==========================================");

    // Use the mutation to assign sales person
    assignSalesPersonMutation.mutate(data);
  };

  // Debug: Log form values whenever they change
  const staffId = form.watch("staffId");
  const commissionAmount = form.watch("commissionAmount");
  const salesItemId = form.watch("salesItemId");

  console.log("=== FORM DEBUG ===");
  console.log("ownerProperty?.id:", ownerProperty?.id);
  console.log("salesItemId:", salesItemId);
  console.log("staffId:", staffId);
  console.log("commissionAmount:", commissionAmount);
  console.log("Form is valid:", form.formState.isValid);
  console.log("Form errors:", form.formState.errors);
  console.log("==================");

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="mt-10 min-w-4xl h-[calc(100vh-150px)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-xl">
                Assign Sales Person
              </h2>
              <p className="text-gray-600 text-sm">
                {ownerProperty?.ownerName} - {ownerProperty?.propertyName}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            Select a sales person to assign to this property. Consider their
            workload, specializations, and performance when making your
            selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Property Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-700 text-sm">
                  {ownerProperty?.ownerName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-600" />
                <span className="font-medium text-gray-700 text-sm">
                  {ownerProperty?.propertyName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700 text-sm">
                  Current:{" "}
                  {ownerProperty?.assignedSalesPerson?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700 text-sm">
                  Status: {ownerProperty?.status}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Sales Person Selection */}
              <div className="space-y-3">
                <Label className="font-medium text-gray-700 text-sm">
                  Search Sales People
                </Label>
                <div className="relative">
                  <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Search by name or email..."
                    className="pl-10"
                    disabled={isLoadingStaff}
                  />
                  {isLoadingStaff && (
                    <Loader2 className="top-1/2 right-3 absolute w-4 h-4 text-gray-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* Show Found Sales People only when searching and no sales person is selected */}
              {searchTerm && !form.watch("staffId") && (
                <div className="space-y-2">
                  <Label className="font-medium text-gray-700 text-sm">
                    Found Sales People
                  </Label>
                  {isLoadingStaff ? (
                    <div className="flex flex-col justify-center items-center py-8 text-center">
                      <Loader2 className="mb-3 w-8 h-8 text-gray-400 animate-spin" />
                      <h3 className="mb-2 font-medium text-gray-900 text-lg">
                        Searching Sales People...
                      </h3>
                      <p className="max-w-sm text-gray-500">
                        Looking for sales people matching &quot;{searchTerm}
                        &quot;
                      </p>
                    </div>
                  ) : filteredSalesPeople.length === 0 ? (
                    <div className="flex flex-col justify-center items-center py-8 text-center">
                      <div className="flex justify-center items-center bg-gray-100 mb-4 rounded-full w-16 h-16">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="mb-2 font-medium text-gray-900 text-lg">
                        No Sales People Found
                      </h3>
                      <p className="max-w-sm text-gray-500">
                        No sales people found matching &quot;{searchTerm}&quot;.
                        Try different keywords or check back later.
                      </p>
                    </div>
                  ) : (
                    <div className="gap-3 grid grid-cols-1 max-h-60 overflow-y-auto">
                      {filteredSalesPeople.map((person) => (
                        <div
                          key={person.id}
                          onClick={() => form.setValue("staffId", person.id)}
                          className="hover:shadow-md p-4 border border-gray-200 hover:border-gray-300 rounded-lg transition-all cursor-pointer"
                        >
                          <div className="space-y-3">
                            {/* Header with Avatar, Name, and Position */}
                            <div className="flex items-center space-x-3">
                              <div className="flex justify-center items-center bg-gray-200 rounded-full w-12 h-12">
                                {person.avatar ? (
                                  <img
                                    src={person.avatar}
                                    alt={person.name}
                                    className="rounded-full w-12 h-12 object-cover"
                                  />
                                ) : (
                                  <User className="w-6 h-6 text-gray-500" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-base">
                                  {person.name}
                                </h4>
                                <p className="text-gray-600 text-sm">
                                  {person.position || "Sales Person"}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  {person.email}
                                </p>
                              </div>
                            </div>

                            {/* Contact Info */}
                            <div className="flex justify-between items-center text-gray-500 text-xs">
                              <span>{person.phone}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Show selected sales person when one is selected */}
              {form.watch("staffId") && (
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm">Selected Sales Person</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        form.setValue("staffId", "");
                        setInputValue("");
                      }}
                      className="hover:bg-gray-100 p-1 w-6 h-6 text-xs"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="bg-green-50 p-3 border border-green-200 rounded-lg">
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-center space-x-2">
                        <div className="flex justify-center items-center bg-green-100 rounded-full w-8 h-8">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {filteredSalesPeople.find(
                              (p) => p.id === form.watch("staffId")
                            )?.name || "Unknown Sales Person"}
                          </h4>
                          <p className="text-gray-600 text-xs truncate">
                            {filteredSalesPeople.find(
                              (p) => p.id === form.watch("staffId")
                            )?.position || "Sales Person"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Commission Settings */}
              <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="commissionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full !h-11">
                            <SelectValue placeholder="Select commission type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">
                            Percentage (%)
                          </SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commissionAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Commission Value
                        {form.watch("commissionType") === "percentage"
                          ? " (%)"
                          : " (Amount)"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            form.watch("commissionType") === "percentage"
                              ? "Enter percentage (e.g., 5)"
                              : "Enter amount (e.g., 1000)"
                          }
                          className="!h-11"
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentSetting"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Setting</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full !h-11">
                            <SelectValue placeholder="Select payment setting" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="per_payment">
                            Per Payment
                          </SelectItem>
                          <SelectItem value="per_project_completion">
                            Per Project Completion
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes or instructions..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional notes about this assignment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            onClick={form.handleSubmit(onSubmit)}
            disabled={
              !form.watch("staffId") ||
              !form.watch("commissionAmount") ||
              assignSalesPersonMutation.isPending
            }
          >
            {assignSalesPersonMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <User className="w-4 h-4" />
            )}
            {assignSalesPersonMutation.isPending
              ? "Assigning..."
              : "Assign Sales Person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignSalesPersonModal;
