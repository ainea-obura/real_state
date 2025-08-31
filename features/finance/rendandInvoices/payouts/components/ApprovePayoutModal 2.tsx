import { CheckCircle2, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import PhoneInput from 'react-phone-input-2';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { ALL_PAYMENT_METHOD_CHOICES } from '@/features/finance/paymen-methods';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useForm } from 'react-hook-form';

interface ApprovePayoutModalProps {
  open: boolean;
  onClose: () => void;
  onApprove: (data: {
    tab: string;
    payment_method: string;
    account: string;
    amount: number;
    reference: string;
    paybill_number?: string;
    paybill_option?: string;
  }) => void;
  payout: {
    payout_number: string;
    owner_name: string;
    net_amount: string;
    owner_phone: string;
    amount: number;
  };
  loading?: boolean;
}

const PAYBILL_OPTIONS = [
  { value: 'PAYBILL', label: 'Pay Bill' },
  { value: 'TILL', label: 'Buy Goods' },
];

const PAYBILL_METHODS = [
  { code: "63902", name: "MPesa" },
  { code: "00", name: "SasaPay" },
];

const getMethodsByType = (type: string) =>
  ALL_PAYMENT_METHOD_CHOICES.filter((m) => m.type.toLowerCase() === type.toLowerCase());

const ApprovePayoutModal: React.FC<ApprovePayoutModalProps> = ({
  open,
  onClose,
  onApprove,
  payout,
  loading = false,
}) => {
  const [tab, setTab] = useState('mobile');
  const [paybillOption, setPaybillOption] = useState(PAYBILL_OPTIONS[0].value);

  // Forms
  const mobileForm = useForm({
    defaultValues: {
      method: getMethodsByType('Mobile')[0]?.code || '',
      phone: payout.owner_phone || '',
      amount: payout.amount || 0,
      reference: payout.payout_number || '',
    },
  });
  const bankForm = useForm({
    defaultValues: {
      method: getMethodsByType('Bank')[0]?.code || '',
      account: '',
      amount: payout.amount || 0,
      reference: payout.payout_number || '',
    },
  });
  const paybillForm = useForm({
    defaultValues: {
      option: PAYBILL_OPTIONS[0].value,
      method: PAYBILL_METHODS[0]?.code || '',
      account: payout.owner_phone || '',
      paybill_number: '',
      amount: payout.amount || 0,
      reference: payout.payout_number || '',
    },
  });

  // Submit handler
  const handleSubmit = async () => {
    let values;
    let tabKey = tab;
    if (tab === 'mobile') {
      values = mobileForm.getValues();
      onApprove({
        tab: tabKey,
        payment_method: values.method,
        account: values.phone,
        amount: values.amount,
        reference: values.reference,
      });
    } else if (tab === 'bank') {
      values = bankForm.getValues();
      onApprove({
        tab: tabKey,
        payment_method: values.method,
        account: values.account,
        amount: values.amount,
        reference: values.reference,
      });
    } else if (tab === 'paybill') {
      values = paybillForm.getValues();
      onApprove({
        tab: tabKey,
        payment_method: values.method,
        account: values.account,
        amount: values.amount,
        reference: values.reference,
        paybill_number: values.paybill_number,
        paybill_option: values.option,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden p-0 rounded-2xl shadow-2xl sm:max-w-2xl">
        {/* Gradient Header */}
        <div className="flex flex-col items-center px-6 py-5">
          <CheckCircle2 className="mb-2 w-10 h-10 text-green-500" />
          <DialogTitle className="mb-1 text-2xl font-bold tracking-tight text-green-500">
            Approve Payout
          </DialogTitle>
          <div className="text-sm text-green-100">
            Please review and confirm this payout
          </div>
        </div>
        {/* Payout Summary */}
        <div className="px-6 pt-2 pb-4 space-y-3 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-500">Payout Number</span>
            <span className="text-lg font-bold text-gray-900">{payout.payout_number}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-500">Owner</span>
            <span className="font-semibold text-gray-900">{payout.owner_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-500">Total Amount</span>
            <span className="text-lg font-bold text-green-700">{payout.net_amount}</span>
          </div>
        </div>
        {/* Tabs */}
        <Tabs value={tab} onValueChange={loading ? undefined : setTab} className="px-6 pt-2">
          <TabsList className="flex justify-between px-2 mb-4 w-full bg-transparent border-b-2 border-green-200">
            <TabsTrigger
              value="mobile"
              className="flex-1 text-lg font-semibold py-3 px-2 bg-transparent border-b-4 border-transparent transition-all duration-200
                data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:font-bold
                data-[state=inactive]:text-gray-400 data-[state=inactive]:border-transparent hover:text-green-600 hover:bg-green-50"
              disabled={loading}
              tabIndex={loading ? -1 : 0}
              style={loading ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
            >
              Mobile Money
            </TabsTrigger>
            <TabsTrigger
              value="bank"
              className="flex-1 text-lg font-semibold py-3 px-2 bg-transparent border-b-4 border-transparent transition-all duration-200
                data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:font-bold
                data-[state=inactive]:text-gray-400 data-[state=inactive]:border-transparent hover:text-green-600 hover:bg-green-50"
              disabled={loading}
              tabIndex={loading ? -1 : 0}
              style={loading ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
            >
              Bank
            </TabsTrigger>
            <TabsTrigger
              value="paybill"
              className="flex-1 text-lg font-semibold py-3 px-2 bg-transparent border-b-4 border-transparent transition-all duration-200
                data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:font-bold
                data-[state=inactive]:text-gray-400 data-[state=inactive]:border-transparent hover:text-green-600 hover:bg-green-50"
              disabled={loading}
              tabIndex={loading ? -1 : 0}
              style={loading ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
            >
              Pay Bill
            </TabsTrigger>
          </TabsList>
          {/* Mobile Money Tab */}
          <TabsContent value="mobile">
            <Form {...mobileForm}>
              <form className="pt-4 space-y-4">
                <FormField
                  control={mobileForm.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getMethodsByType('Mobile').map((m) => (
                            <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={mobileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput
                          country={"ke"}
                          value={field.value}
                          onChange={field.onChange}
                          inputClass="w-full h-11"
                          inputStyle={{ width: "100%", height: "44px" }}
                          specialLabel=""
                          enableSearch={true}
                          searchPlaceholder="Search country"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={mobileForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={mobileForm.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>
          {/* Bank Tab */}
          <TabsContent value="bank">
            <Form {...bankForm}>
              <form className="pt-4 space-y-4">
                <FormField
                  control={bankForm.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getMethodsByType('Bank').map((m) => (
                            <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bankForm.control}
                  name="account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bankForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bankForm.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>
          {/* Pay Bill Tab */}
          <TabsContent value="paybill">
            <Form {...paybillForm}>
              <form className="pt-4 space-y-4">
                <div className="flex gap-4">
                  <FormField
                    control={paybillForm.control}
                    name="option"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Pay Bill Option</FormLabel>
                        <Select onValueChange={(val) => { field.onChange(val); setPaybillOption(val); }} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYBILL_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={paybillForm.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYBILL_METHODS.map((m) => (
                              <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {paybillOption === 'PAYBILL' && (
                  <FormField
                    control={paybillForm.control}
                    name="paybill_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paybill Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={paybillForm.control}
                  name="account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{paybillOption === 'TILL' ? 'Till Number' : 'Account Number'}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paybillForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paybillForm.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </TabsContent>
        </Tabs>
        <DialogFooter className="flex gap-2 justify-end px-6 py-4 bg-gray-50 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-lg"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex gap-2 items-center px-6 py-2 text-base font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            type="button"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1 w-5 h-5 animate-spin" /> Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1 w-5 h-5" /> Approve
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovePayoutModal;
