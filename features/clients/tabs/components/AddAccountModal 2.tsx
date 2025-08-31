"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Smartphone } from "lucide-react";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AccountFormValues, AccountFormSchema } from "@/schema/accounts/schema";
import { ALL_PAYMENT_METHOD_CHOICES } from "@/features/finance/paymen-methods";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormValues) => void;
  isLoading: boolean;
  userId: string;
}

const AddAccountModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  userId,
}: AddAccountModalProps) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(AccountFormSchema),
    defaultValues: {
      user_id: userId,
      account_name: "",
      account_code: "",
      account_number: "",
      account_type: "bank",
      bank_name: "",
      is_default: false,
      is_active: true,
    },
  });

  const accountType = form.watch("account_type");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        user_id: userId,
        account_name: "",
        account_code: "",
        account_number: "",
        account_type: "bank",
        bank_name: "",
        is_default: false,
        is_active: true,
      });
      setSelectedPaymentMethod(null);
    }
  }, [isOpen, form, userId]);

  // Update payment method when selected from dropdown
  const handlePaymentMethodSelection = (code: string) => {
    const paymentMethods = getPaymentMethodsByType(accountType);
    const method = paymentMethods.find((m) => m.code === code);
    if (method) {
      setSelectedPaymentMethod(method);
      form.setValue("account_code", method.code);
      form.setValue("bank_name", method.name);
      // Auto-set account name based on selected provider
      form.setValue("account_name", method.name);
    }
  };

  // Clear payment method fields when switching account type
  useEffect(() => {
    form.setValue("account_code", "");
    form.setValue("bank_name", "");
    form.setValue("account_name", "");
    setSelectedPaymentMethod(null);
  }, [accountType, form]);

  const handleSubmit = (data: AccountFormValues) => {
    // Ensure user_id is included in the submission
    const submitData = {
      ...data,
      user_id: userId,
    };
    onSubmit(submitData);
  };

  // Get payment methods by account type
  const getPaymentMethodsByType = (type: "mobile" | "bank") => {
    return ALL_PAYMENT_METHOD_CHOICES.filter((method) => {
      if (type === "bank") {
        return method.type === "Bank" && method.working === true;
      } else {
        return (method.type === "Mobile") && method.working === true;
      }
    });
  };

  const paymentMethods = getPaymentMethodsByType(accountType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Building2 className="w-5 h-5" />
            Add New Account
          </DialogTitle>
          <DialogDescription>
            Add a new bank account or mobile money account for receiving payments.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Account Type and Provider Selection - Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Account Type */}
              <FormField
                control={form.control}
                name="account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bank">
                          <div className="flex gap-2 items-center">
                            <Building2 className="w-4 h-4" />
                            Bank
                          </div>
                        </SelectItem>
                        <SelectItem value="mobile">
                          <div className="flex gap-2 items-center">
                            <Smartphone className="w-4 h-4" />
                            Mobile
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Method Selection */}
              <FormField
                control={form.control}
                name="account_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {accountType === "bank" ? "Bank" : "Provider"}
                    </FormLabel>
                    <Select
                      onValueChange={handlePaymentMethodSelection}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={
                            accountType === "bank" 
                              ? "Select bank" 
                              : "Select provider"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.code} value={method.code}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Account Number - Dynamic Input */}
            <FormField
              control={form.control}
              name="account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {accountType === "bank" ? "Account Number" : "Mobile Number"}
                  </FormLabel>
                  <FormControl>
                    {accountType === "bank" ? (
                      <Input
                        placeholder="e.g., 1234567890"
                        {...field}
                      />
                    ) : (
                      <Controller
                        name="account_number"
                        control={form.control}
                        render={({ field }) => (
                          <PhoneInput
                            country={"ke"}
                            value={field.value}
                            onChange={field.onChange}
                            inputClass="w-full h-11"
                            inputStyle={{ width: "100%", height: "44px" }}
                            specialLabel=""
                            disabled={isLoading}
                            enableSearch={true}
                            searchPlaceholder="Search country"
                            placeholder="Enter mobile number"
                          />
                        )}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default Account */}
            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Set as default account</FormLabel>
                    <p className="text-sm text-gray-600">
                      This account will be used as the primary payment destination
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active account</FormLabel>
                    <p className="text-sm text-gray-600">
                      This account can receive payments
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Account"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccountModal;
