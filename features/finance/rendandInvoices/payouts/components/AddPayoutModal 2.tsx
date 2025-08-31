"use client";

import { format } from 'date-fns';
import { Calculator, CalendarIcon, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    calculatePayout, createMockRentData, getDefaultSettings, PayoutCalculation, PayoutSettings,
    RentData,
} from '../utils/payoutCalculator';

const payoutSchema = z.object({
  ownerId: z.string().min(1, "Owner is required"),
  propertyId: z.string().min(1, "Property is required"),
  payoutDate: z.date({
    required_error: "Payout date is required",
  }),
  payoutMethod: z.enum([
    "bank_transfer",
    "cash",
    "check",
    "online",
    "mobile_money",
    "other",
  ]),
  amountPaid: z.number().min(0.01, "Amount must be greater than 0"),
  periodStartDate: z.date({
    required_error: "Period start date is required",
  }),
  periodEndDate: z.date({
    required_error: "Period end date is required",
  }),
  rentCollected: z.number().min(0, "Rent collected must be 0 or greater"),
  expenses: z.number().min(0, "Expenses must be 0 or greater"),
  managementFee: z.number().min(0, "Management fee must be 0 or greater"),
  notes: z.string().optional(),
});

type PayoutFormData = z.infer<typeof payoutSchema>;

interface AddPayoutModalProps {
  open: boolean;
  onClose: () => void;
}

// Mock data for owners and properties
const mockOwners = [
  { id: "1", name: "John Smith", email: "john.smith@email.com" },
  { id: "2", name: "Sarah Johnson", email: "sarah.johnson@email.com" },
  { id: "3", name: "Mike Davis", email: "mike.davis@email.com" },
  { id: "4", name: "Emma Brown", email: "emma.brown@email.com" },
  { id: "5", name: "Lisa Wilson", email: "lisa.wilson@email.com" },
];

const mockProperties = [
  { id: "1", unit: "A101", projectName: "Project Alpha" },
  { id: "2", unit: "A102", projectName: "Project Alpha" },
  { id: "3", unit: "A103", projectName: "Project Beta" },
  { id: "4", unit: "B201", projectName: "Project Gamma" },
  { id: "5", unit: "B202", projectName: "Project Gamma" },
];

const AddPayoutModal = ({ open, onClose }: AddPayoutModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculation, setCalculation] = useState<PayoutCalculation | null>(
    null
  );
  const [settings] = useState<PayoutSettings>(getDefaultSettings());
  const [manualOverride, setManualOverride] = useState(false);

  const form = useForm<PayoutFormData>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      payoutDate: new Date(),
      payoutMethod: "bank_transfer",
      amountPaid: 0,
      rentCollected: 0,
      expenses: 0,
      managementFee: 0,
      notes: "",
    },
  });

  // Watch form values for auto-calculation
  const watchedPropertyId = form.watch("propertyId");
  const watchedOwnerId = form.watch("ownerId");
  const watchedPeriodStart = form.watch("periodStartDate");
  const watchedPeriodEnd = form.watch("periodEndDate");

  // Auto-calculate when property, owner, or period changes
  useEffect(() => {
    if (
      watchedPropertyId &&
      watchedOwnerId &&
      watchedPeriodStart &&
      watchedPeriodEnd
    ) {
      performAutoCalculation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchedPropertyId,
    watchedOwnerId,
    watchedPeriodStart,
    watchedPeriodEnd,
    settings,
  ]);

  const performAutoCalculation = () => {
    if (
      !watchedPropertyId ||
      !watchedOwnerId ||
      !watchedPeriodStart ||
      !watchedPeriodEnd
    )
      return;

    // In real app, fetch rent/expense data for property/period here
    const rentData: RentData = createMockRentData(
      watchedPropertyId,
      watchedPeriodStart,
      watchedPeriodEnd
    );
    const calc = calculatePayout(rentData, settings);
    setCalculation(calc);

    // Auto-fill form fields
    form.setValue("rentCollected", rentData.rentCollected);
    form.setValue("expenses", calc.totalExpenses);
    form.setValue("managementFee", calc.managementFee);
    form.setValue("amountPaid", calc.netPayout);
  };

  // Manual override toggle
  const handleManualOverride = () => {
    setManualOverride((prev) => !prev);
  };

  const onSubmit = async (data: PayoutFormData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement actual API call

      await new Promise((resolve) => setTimeout(resolve, 1000));
      onClose();
      form.reset();
      setCalculation(null);
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setCalculation(null);
    setManualOverride(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add New Payout</DialogTitle>
          <DialogDescription>
            The system automatically calculates the payout based on rent
            collected, expenses, and management fee. Review and confirm.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Owner and Property Selection */}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockOwners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{owner.name}</span>
                              <span className="text-gray-500 text-sm">
                                {owner.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockProperties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {property.unit}
                              </span>
                              <span className="text-gray-500 text-sm">
                                {property.projectName}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Period Dates */}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="periodStartDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Period Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="pl-3 w-full font-normal text-left"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="opacity-50 ml-auto w-4 h-4" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-auto" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodEndDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Period End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="pl-3 w-full font-normal text-left"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="opacity-50 ml-auto w-4 h-4" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-auto" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Calculation Breakdown */}
            {calculation && (
              <div className="bg-blue-50 mb-2 p-4 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">
                    Automated Calculation
                  </h3>
                  {calculation.requiresApproval && (
                    <span className="ml-2 font-semibold text-orange-600 text-xs">
                      Approval Required
                    </span>
                  )}
                </div>
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-gray-600">Rent Collected:</span>
                    <span className="ml-2 font-medium text-green-600">
                      ${calculation.breakdown.rentCollected.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Service Charge:</span>
                    <span className="ml-2 font-medium text-red-600">
                      -${calculation.managementFee.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Service Charge Type:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      Conditional (based on unpaid invoices)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Net Amount to Owner:</span>
                    <span className="ml-2 font-bold text-blue-600">
                      ${calculation.netPayout.toLocaleString()}
                    </span>
                  </div>
                </div>
                {calculation.warnings.length > 0 && (
                  <ul className="mt-2 text-orange-700 text-xs list-disc list-inside">
                    {calculation.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
                {calculation.errors.length > 0 && (
                  <ul className="mt-2 text-red-700 text-xs list-disc list-inside">
                    {calculation.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
                {settings.allowManualOverrides && (
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      type="button"
                      size="sm"
                      variant={manualOverride ? "default" : "outline"}
                      onClick={handleManualOverride}
                    >
                      {manualOverride
                        ? "Disable Manual Override"
                        : "Enable Manual Override"}
                    </Button>
                    <span className="text-gray-500 text-xs">
                      Allow editing calculated values
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Payout Date and Method */}
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="payoutDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Payout Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="pl-3 w-full font-normal text-left"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="opacity-50 ml-auto w-4 h-4" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-auto" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payoutMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payout Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bank_transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="mobile_money">
                          Mobile Money
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Financial Details - Manual Override */}
            <div className="space-y-4">
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="rentCollected"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rent Collected</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="top-3 left-3 absolute w-4 h-4 text-gray-400" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-10"
                            {...field}
                            readOnly={!manualOverride}
                            onChange={(e) => {
                              if (manualOverride) {
                                const value = e.target.value;
                                if (value === "") {
                                  field.onChange(0);
                                } else {
                                  const parsed = parseFloat(value);
                                  if (!isNaN(parsed) && parsed >= 0) {
                                    field.onChange(parsed);
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="managementFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Charge (Conditional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="top-3 left-3 absolute w-4 h-4 text-gray-400" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-10"
                            {...field}
                            readOnly={!manualOverride}
                            onChange={(e) => {
                              if (manualOverride) {
                                const value = e.target.value;
                                if (value === "") {
                                  field.onChange(0);
                                } else {
                                  const parsed = parseFloat(value);
                                  if (!isNaN(parsed) && parsed >= 0) {
                                    field.onChange(parsed);
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Final Amount Display */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">
                    Amount to Pay Owner:
                  </span>
                  <span className="font-bold text-green-600 text-lg">
                    ${form.watch("amountPaid")?.toLocaleString() || "0"}
                  </span>
                </div>
                <p className="mt-1 text-gray-500 text-sm">
                  Rent Collected - Service Charge (conditional)
                </p>
                <p className="mt-1 text-blue-600 text-xs">
                  Service charge is only applied if there are unpaid owner
                  invoices with SERVICE_CHARGE items
                </p>
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this payout..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting || (calculation ? !calculation.isValid : false)
                }
              >
                {isSubmitting ? "Creating..." : "Create Payout"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPayoutModal;
