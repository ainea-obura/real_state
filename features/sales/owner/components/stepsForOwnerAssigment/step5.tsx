import { Calendar, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';

import { Card } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface PaymentPlan {
  id: string;
  name: string;
  periods: number;
  frequency: string;
  deposit: number;
}

interface PaymentPlanSummaryStepProps {
  form: UseFormReturn<Record<string, unknown>>;
  totalPropertyPrice: number;
  mockPaymentPlans: PaymentPlan[];
  setValue: (field: string, value: unknown) => void;
  isLoadingTemplates?: boolean;
  onTemplateChange?: (templateId: string | null) => void;
  isCustomMode?: boolean;
  onManualValueChange?: () => void;
}

const PaymentPlanSummaryStep = ({
  form,
  totalPropertyPrice,
  mockPaymentPlans,
  setValue,
  isLoadingTemplates = false,
  onTemplateChange,
  isCustomMode = false,
  onManualValueChange,
}: PaymentPlanSummaryStepProps) => {
  // Helper function to round numbers properly (up if decimal >= 0.5, down if < 0.5)
  const roundToWhole = (value: number): number => {
    return Math.round(value);
  };
  return (
    <div className="space-y-4">
      {/* Payment Plan Selection - Compact */}
      <Card className="bg-blue-50 p-4 border-blue-200">
        <div className="flex items-center space-x-2 mb-3">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <FormLabel className="font-semibold text-blue-900 text-base">
            Payment Plan Type
          </FormLabel>
        </div>

        <FormField
          control={form.control}
          name="paymentPlan"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="gap-3 grid grid-cols-2"
                >
                  <div className="flex items-center space-x-2 bg-white hover:bg-blue-50 p-3 border border-blue-200 rounded-lg cursor-pointer">
                    <FormControl>
                      <RadioGroupItem value="full" />
                    </FormControl>
                    <FormLabel className="font-medium text-blue-900 text-sm cursor-pointer">
                      Full Payment
                    </FormLabel>
                  </div>
                  <div className="flex items-center space-x-2 bg-white hover:bg-blue-50 p-3 border border-blue-200 rounded-lg cursor-pointer">
                    <FormControl>
                      <RadioGroupItem value="installments" />
                    </FormControl>
                    <FormLabel className="font-medium text-blue-900 text-sm cursor-pointer">
                      Installments
                    </FormLabel>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Card>

      {/* Installment Plan Details - Only when selected */}
      {form.watch("paymentPlan") === "installments" && (
        <div className="space-y-4">
          {/* Template Selection */}
          <Card className="bg-green-50 p-4 border-green-200">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <FormLabel className="font-semibold text-green-900 text-base">
                Quick Templates
              </FormLabel>
            </div>

            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        const template = mockPaymentPlans.find(
                          (p) => p.id === value
                        );
                        if (template) {
                          console.log("Template selected:", template);
                          console.log(
                            "Template deposit value:",
                            template.deposit,
                            "Type:",
                            typeof template.deposit
                          );

                          // Ensure deposit is a valid number and convert to integer
                          const depositValue = Number(template.deposit);
                          console.log(
                            "Processing template deposit:",
                            template.deposit,
                            "Converted to:",
                            depositValue
                          );

                          if (
                            !isNaN(depositValue) &&
                            depositValue >= 0 &&
                            depositValue <= 100
                          ) {
                            console.log(
                              "Setting downPayment to:",
                              Math.round(depositValue)
                            );
                            setValue("downPayment", Math.round(depositValue));

                            // Verify the value was set
                            setTimeout(() => {
                              const currentValue =
                                form.getValues("downPayment");
                              console.log(
                                "downPayment after setValue:",
                                currentValue
                              );
                            }, 100);
                          } else {
                            console.error(
                              "Invalid deposit value:",
                              template.deposit
                            );
                            setValue("downPayment", 0);
                          }

                          setValue("installmentCount", template.periods);
                          setValue(
                            "frequency",
                            template.frequency.toLowerCase()
                          );

                          // Auto-calculate start date
                          const today = new Date();
                          const startDate = new Date(today);
                          if (template.frequency.toLowerCase() === "monthly") {
                            startDate.setMonth(today.getMonth() + 1);
                          } else if (
                            template.frequency.toLowerCase() === "quarterly"
                          ) {
                            startDate.setMonth(today.getMonth() + 3);
                          } else if (
                            template.frequency.toLowerCase() === "semi-annual"
                          ) {
                            startDate.setMonth(today.getMonth() + 6);
                          } else if (
                            template.frequency.toLowerCase() === "annual"
                          ) {
                            startDate.setMonth(today.getMonth() + 12);
                          }
                          setValue(
                            "startDate",
                            startDate.toISOString().split("T")[0]
                          );

                          // Notify parent about template selection
                          onTemplateChange?.(template.id);
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-full !h-11">
                        <SelectValue placeholder="Choose a payment template" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] max-h-[300px]">
                        {isLoadingTemplates ? (
                          <div className="p-4 text-gray-500 text-sm text-center">
                            Loading templates...
                          </div>
                        ) : mockPaymentPlans.length === 0 ? (
                          <div className="p-4 text-gray-500 text-sm text-center">
                            No payment templates available
                          </div>
                        ) : (
                          mockPaymentPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{plan.name}</span>
                                <span className="text-gray-500 text-xs">
                                  {plan.deposit}% down • {plan.periods}{" "}
                                  {plan.frequency} payments
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>

          {/* Customization - 2-Column Grid */}
          <Card className="p-4 border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <FormLabel className="font-semibold text-gray-900 text-base">
                  Customize Plan
                </FormLabel>
              </div>
              {isCustomMode && (
                <div className="bg-orange-100 px-2 py-1 rounded-full font-medium text-orange-700 text-xs">
                  Custom Mode
                </div>
              )}
            </div>

            <div className="gap-4 grid grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm">Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="w-full"
                        onChange={(e) => {
                          field.onChange(e);
                          // When start date changes, switch to custom mode
                          onManualValueChange?.();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm">Frequency</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // When frequency changes, switch to custom mode
                          onManualValueChange?.();
                        }}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="semi-annual">
                            Semi-Annual
                          </SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="installmentCount"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm">Installments</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="12"
                        min="1"
                        max="120"
                        value={
                          field.value !== undefined && field.value !== null
                            ? field.value
                            : ""
                        }
                        onChange={(e) => {
                          const value =
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value);
                          field.onChange(value);
                          // When installment count changes, switch to custom mode
                          onManualValueChange?.();
                        }}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="downPayment"
                render={({ field }) => {
                  console.log(
                    "downPayment field render - field.value:",
                    field.value,
                    "Type:",
                    typeof field.value
                  );

                  return (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm">Down Payment %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="20"
                          min="0"
                          max="100"
                          value={
                            field.value !== undefined && field.value !== null
                              ? field.value
                              : ""
                          }
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value);
                            console.log(
                              "downPayment onChange - setting value to:",
                              value
                            );
                            field.onChange(value);
                            // When down payment changes, switch to custom mode
                            onManualValueChange?.();
                          }}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </Card>

          {/* Payment Summary - Compact & Informative */}
          {form.watch("paymentPlan") === "installments" && (
            <Card className="bg-purple-50 p-4 border-purple-200">
              <div className="flex items-center space-x-2 mb-3">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <FormLabel className="font-semibold text-purple-900 text-base">
                  Payment Summary
                </FormLabel>
              </div>

              {(() => {
                const downPaymentPercent = form.watch("downPayment");
                const installmentCount = form.watch("installmentCount");
                const frequency = form.watch("frequency");
                const startDate = form.watch("startDate");

                console.log(
                  "Form values - downPayment:",
                  downPaymentPercent,
                  "Type:",
                  typeof downPaymentPercent
                );
                console.log(
                  "Form values - installmentCount:",
                  installmentCount,
                  "Type:",
                  typeof installmentCount
                );
                console.log(
                  "Form values - frequency:",
                  frequency,
                  "Type:",
                  typeof frequency
                );

                if (
                  !downPaymentPercent ||
                  !installmentCount ||
                  !frequency ||
                  !startDate
                ) {
                  return (
                    <div className="py-4 text-gray-500 text-sm text-center">
                      Complete all fields to see payment breakdown
                    </div>
                  );
                }

                // Calculate payment details
                const downPayment = roundToWhole(
                  totalPropertyPrice * (downPaymentPercent / 100)
                );
                const remainingBalance = totalPropertyPrice - downPayment;
                const installmentAmount = roundToWhole(
                  remainingBalance / installmentCount
                );

                console.log("Payment calculations:");
                console.log("- totalPropertyPrice:", totalPropertyPrice);
                console.log("- downPaymentPercent:", downPaymentPercent);
                console.log("- calculated downPayment:", downPayment);
                console.log("- remainingBalance:", remainingBalance);
                console.log("- installmentAmount:", installmentAmount);
                const totalMonths =
                  frequency === "monthly"
                    ? installmentCount
                    : frequency === "quarterly"
                    ? installmentCount * 3
                    : frequency === "semi-annual"
                    ? installmentCount * 6
                    : installmentCount * 12;

                const start = new Date(startDate);
                const endDate = new Date(start);
                endDate.setMonth(start.getMonth() + totalMonths);

                return (
                  <div className="space-y-3">
                    {/* Quick Overview */}
                    <div className="gap-3 grid grid-cols-3 text-center">
                      <div className="bg-white p-2 border border-purple-200 rounded">
                        <p className="font-medium text-purple-600 text-xs">
                          Duration
                        </p>
                        <p className="font-bold text-purple-900 text-sm">
                          {totalMonths} months
                        </p>
                      </div>
                      <div className="bg-white p-2 border border-purple-200 rounded">
                        <p className="font-medium text-purple-600 text-xs">
                          Start
                        </p>
                        <p className="font-semibold text-purple-900 text-sm">
                          {start.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="bg-white p-2 border border-purple-200 rounded">
                        <p className="font-medium text-purple-600 text-xs">
                          End
                        </p>
                        <p className="font-semibold text-purple-900 text-sm">
                          {endDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="gap-4 grid grid-cols-2 text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Total Property Value:
                          </span>
                          <span className="font-medium">
                            KES{" "}
                            {roundToWhole(totalPropertyPrice).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Total Down Payment:
                          </span>
                          <span className="font-medium text-blue-600">
                            KES {downPayment.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Total Remaining:
                          </span>
                          <span className="font-medium text-green-600">
                            KES {remainingBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Installments:</span>
                          <span className="font-medium text-purple-600">
                            {installmentCount} payments
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frequency:</span>
                          <span className="font-medium text-purple-600 capitalize">
                            {frequency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Total Per Payment:
                          </span>
                          <span className="font-medium text-purple-600">
                            KES {installmentAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Schedule */}
                    <div className="pt-2 border-purple-200 border-t">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-purple-700">
                          Payment Schedule (Total Amounts)
                        </span>
                        <span className="text-purple-600">
                          KES {installmentAmount.toLocaleString()} ×{" "}
                          {installmentCount}
                        </span>
                      </div>
                      <div className="bg-white mt-2 p-2 border border-purple-200 rounded">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">Down Payment</span>
                          <span className="font-medium text-blue-600">
                            {start.toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1 text-xs">
                          <span className="text-gray-600">Installments</span>
                          <span className="font-medium text-purple-600">
                            KES {installmentAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="bg-blue-50 mt-2 p-2 border border-blue-200 rounded text-blue-700 text-xs">
                        <strong>Note:</strong> Individual owner amounts will be
                        calculated automatically based on their ownership
                        percentages.
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentPlanSummaryStep;
