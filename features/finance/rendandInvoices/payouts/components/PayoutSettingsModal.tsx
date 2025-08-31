"use client";

import {
    AlertTriangle, Building2, Calculator, CheckCircle, CreditCard, DollarSign, Percent, Settings,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';

const payoutSettingsSchema = z.object({
  // Management Fee Settings
  managementFeeType: z.enum(["percentage", "fixed"]),
  defaultManagementFee: z.number().min(0, "Fee must be 0 or greater"),
  managementFeePercentage: z
    .number()
    .min(0)
    .max(100, "Percentage must be between 0-100"),
  managementFeeFixedAmount: z
    .number()
    .min(0, "Fixed amount must be 0 or greater"),

  // Auto-Calculation Settings
  autoCalculateFees: z.boolean(),
  autoIncludeExpenses: z.boolean(),
  autoIncludeUtilities: z.boolean(),
  autoIncludeMaintenance: z.boolean(),
  autoIncludeOtherCharges: z.boolean(),

  // Expense Categories
  includeUtilities: z.boolean(),
  includeMaintenance: z.boolean(),
  includeInsurance: z.boolean(),
  includePropertyTax: z.boolean(),
  includeHOA: z.boolean(),
  includeOtherExpenses: z.boolean(),

  // Calculation Rules
  minimumPayoutAmount: z.number().min(0, "Minimum amount must be 0 or greater"),
  roundingMethod: z.enum(["nearest", "up", "down"]),
  taxDeductionPercentage: z
    .number()
    .min(0)
    .max(100, "Tax percentage must be between 0-100"),

  // Notification Settings
  notifyOwnerOnPayout: z.boolean(),
  notifyTenantOnPayout: z.boolean(),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),

  // Advanced Settings
  allowManualOverrides: z.boolean(),
  requireApproval: z.boolean(),
  approvalThreshold: z.number().min(0, "Threshold must be 0 or greater"),

  // Notes
  notes: z.string().optional(),
});

type PayoutSettingsFormData = z.infer<typeof payoutSettingsSchema>;

interface PayoutSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const PayoutSettingsModal = ({ open, onClose }: PayoutSettingsModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("fees");

  const form = useForm<PayoutSettingsFormData>({
    resolver: zodResolver(payoutSettingsSchema),
    defaultValues: {
      // Management Fee Settings
      managementFeeType: "percentage",
      defaultManagementFee: 10,
      managementFeePercentage: 10,
      managementFeeFixedAmount: 100,

      // Auto-Calculation Settings
      autoCalculateFees: true,
      autoIncludeExpenses: true,
      autoIncludeUtilities: true,
      autoIncludeMaintenance: true,
      autoIncludeOtherCharges: true,

      // Expense Categories
      includeUtilities: true,
      includeMaintenance: true,
      includeInsurance: false,
      includePropertyTax: false,
      includeHOA: false,
      includeOtherExpenses: true,

      // Calculation Rules
      minimumPayoutAmount: 50,
      roundingMethod: "nearest",
      taxDeductionPercentage: 0,

      // Notification Settings
      notifyOwnerOnPayout: true,
      notifyTenantOnPayout: false,
      emailNotifications: true,
      smsNotifications: false,

      // Advanced Settings
      allowManualOverrides: true,
      requireApproval: false,
      approvalThreshold: 1000,

      notes: "",
    },
  });

  const watchedManagementFeeType = form.watch("managementFeeType");
  const watchedAutoCalculate = form.watch("autoCalculateFees");

  const onSubmit = async (data: PayoutSettingsFormData) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement actual API call to save settings

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onClose();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const tabs = [
    { id: "fees", label: "Management Fees", icon: Percent },
    { id: "expenses", label: "Expense Categories", icon: Building2 },
    { id: "calculation", label: "Calculation Rules", icon: Calculator },
    { id: "notifications", label: "Notifications", icon: CreditCard },
    { id: "advanced", label: "Advanced", icon: Settings },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Payout Settings
          </DialogTitle>
          <DialogDescription>
            Configure automated payout calculations, management fees, expense
            categories, and notification preferences.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 border-b">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    type="button"
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>

            {/* Management Fees Tab */}
            {activeTab === "fees" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Percent className="w-5 h-5" />
                      Service Charge Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure how service charges are calculated and applied
                      to payouts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="managementFeeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Charge Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select service charge type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percentage">
                                Property Service Charge
                              </SelectItem>
                              <SelectItem value="fixed">
                                Fixed Amount
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Service charge is conditionally applied based on
                            unpaid owner invoices with SERVICE_CHARGE items.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchedManagementFeeType === "percentage" ? (
                      <FormField
                        control={form.control}
                        name="managementFeePercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Service Charge</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="150"
                                  className="pr-8"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                />
                                <span className="top-3 right-3 absolute text-gray-500">
                                  KES
                                </span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Service charge amount from property details
                              (unit_detail.service_charge or
                              villa_detail.service_charge).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="managementFeeFixedAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fixed Service Charge</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="top-3 left-3 absolute w-4 h-4 text-gray-400" />
                                <Input
                                  type="number"
                                  placeholder="150"
                                  className="pl-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Fixed service charge amount to be applied when
                              conditions are met.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="autoCalculateFees"
                      render={({ field }) => (
                        <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Auto-Calculate Service Charge
                            </FormLabel>
                            <FormDescription>
                              Automatically apply service charge when unpaid
                              owner invoices with SERVICE_CHARGE items exist.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Expense Categories Tab */}
            {activeTab === "expenses" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Service Charge Conditions
                    </CardTitle>
                    <CardDescription>
                      Configure when service charges are applied to payout
                      calculations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="includeUtilities"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Check for Unpaid Invoices
                              </FormLabel>
                              <FormDescription>
                                Look for unpaid owner invoices with
                                SERVICE_CHARGE items
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="includeMaintenance"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Apply Property Service Charge
                              </FormLabel>
                              <FormDescription>
                                Use property's service_charge when conditions
                                are met
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="includeInsurance"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Invoice Status Check
                              </FormLabel>
                              <FormDescription>
                                Check for ISSUED, PARTIAL, or OVERDUE invoice
                                status
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="includePropertyTax"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Owner Invoice Filter
                              </FormLabel>
                              <FormDescription>
                                Only consider invoices issued to property owners
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="includeHOA"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                SERVICE_CHARGE Items
                              </FormLabel>
                              <FormDescription>
                                Look for invoice items with
                                type="SERVICE_CHARGE"
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="includeOtherExpenses"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Conditional Application
                              </FormLabel>
                              <FormDescription>
                                Only apply service charge when all conditions
                                are met
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Calculation Rules Tab */}
            {activeTab === "calculation" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Calculation Rules
                    </CardTitle>
                    <CardDescription>
                      Configure how payout amounts are calculated and rounded.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="minimumPayoutAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Payout Amount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="top-3 left-3 absolute w-4 h-4 text-gray-400" />
                              <Input
                                type="number"
                                placeholder="50"
                                className="pl-10"
                                {...field}
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
                            </div>
                          </FormControl>
                          <FormDescription>
                            Minimum amount required before a payout can be
                            processed.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="roundingMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rounding Method</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rounding method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="nearest">
                                Nearest Dollar
                              </SelectItem>
                              <SelectItem value="up">Round Up</SelectItem>
                              <SelectItem value="down">Round Down</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How to round calculated payout amounts.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxDeductionPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Deduction Percentage</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="0"
                                className="pr-8"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                              <span className="top-3 right-3 absolute text-gray-500">
                                %
                              </span>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Percentage of payout to withhold for tax purposes.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="autoIncludeExpenses"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Auto-Include Expenses
                              </FormLabel>
                              <FormDescription>
                                Automatically include all enabled expenses
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="allowManualOverrides"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Allow Manual Overrides
                              </FormLabel>
                              <FormDescription>
                                Allow users to manually adjust calculated
                                amounts
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Notification Settings
                    </CardTitle>
                    <CardDescription>
                      Configure who gets notified when payouts are processed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="notifyOwnerOnPayout"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Notify Owner
                              </FormLabel>
                              <FormDescription>
                                Send notification to property owner
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notifyTenantOnPayout"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Notify Tenant
                              </FormLabel>
                              <FormDescription>
                                Send notification to tenant
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Email Notifications
                              </FormLabel>
                              <FormDescription>
                                Send notifications via email
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smsNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                SMS Notifications
                              </FormLabel>
                              <FormDescription>
                                Send notifications via SMS
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === "advanced" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Advanced Settings
                    </CardTitle>
                    <CardDescription>
                      Configure advanced payout processing options.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="requireApproval"
                      render={({ field }) => (
                        <FormItem className="flex flex-row justify-between items-center p-4 border rounded-lg">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Require Approval
                            </FormLabel>
                            <FormDescription>
                              Require manager approval for payouts above
                              threshold
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("requireApproval") && (
                      <FormField
                        control={form.control}
                        name="approvalThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Approval Threshold</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="top-3 left-3 absolute w-4 h-4 text-gray-400" />
                                <Input
                                  type="number"
                                  placeholder="1000"
                                  className="pl-10"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Payouts above this amount require manager
                              approval.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any additional notes about payout settings..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Internal notes about payout configuration.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PayoutSettingsModal;
