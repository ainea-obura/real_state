"use client";

import { CheckCircle, CreditCard, DollarSign, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { fetchInstantPaymentNotifications } from '@/actions/finance/instanatPayments/indetx';
import { fetchUnpaidInvoices, recordPayment } from '@/actions/finance/payment';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import DatePicker from '@/components/ui/date-picker';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PAYMENT_METHOD_CHOICES } from '@/features/finance/paymen-methods';
import { CreatePaymentPayload } from '@/features/finance/scehmas/payment';
import { useRecipientSearch } from '@/hooks/finance/useRecipientSearch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getUserAccounts } from '@/actions/accounts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InvoiceToApply {
  id: string;
  invoiceNumber: string;
  amount: number;
  appliedAmount: number;
  isSelected: boolean;
}

interface TransactionNotification {
  id: string;
  created_at: string;
  updated_at: string;
  merchant_code: string;
  business_short_code: string;
  invoice_number: string;
  payment_method: string;
  trans_id: string;
  third_party_trans_id: string;
  full_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  transaction_type: string;
  msisdn: string;
  org_account_balance: string;
  trans_amount: string;
  trans_time: string;
  bill_ref_number: string;
  is_verified: boolean;
  verified_by: string | null;
  verified_for: string | null;
  verified_for_invoice: string | null;
}

interface CreatePaymentModalProps {
  open: boolean;
  onClose: () => void;
}

const CreatePaymentModal = ({ open, onClose }: CreatePaymentModalProps) => {
  // Date formatting function for transaction dates
  const formatTransactionDate = (dateString: string) => {
    if (!dateString || dateString.length !== 14) return dateString;

    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const hour = dateString.substring(8, 10);
    const minute = dateString.substring(10, 12);
    const second = dateString.substring(12, 14);

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };
  const [formData, setFormData] = useState({
    tenantId: "",
    paymentDate: new Date(),
    selectedAccount: "",
    notes: "",
    sendReceipt: false,
  });
  const [accountError, setAccountError] = useState<string>("");
  const [paymentMethodError, setPaymentMethodError] = useState<string>("");

  // Update recipientType state to be typed as 'tenant' | 'owner'
  const [recipientType, setRecipientType] = useState<"tenant" | "owner">(
    "tenant"
  );
  const [selectedRecipient, setSelectedRecipient] = useState<null | {
    id: string;
    name: string;
  }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<InvoiceToApply[]>(
    []
  );
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<TransactionNotification[]>(
    []
  );
  const [selectedTransactions, setSelectedTransactions] = useState<
    TransactionNotification[]
  >([]);

  // Recipient search hook
  const {
    recipients,
    loading: recipientsLoading,
    error: recipientsError,
    search,
  } = useRecipientSearch(recipientType, searchQuery);

  useEffect(() => {
    search(searchQuery);
  }, [searchQuery, recipientType, search]);

  // Fetch unpaid invoices using useQuery
  const {
    data: unpaidInvoicesData,
    isLoading: invoicesLoading,
    isError: invoicesError,
    error: invoicesErrorObj,
  } = useQuery({
    queryKey: ["unpaid-invoices", recipientType, selectedRecipient?.id],
    queryFn: async () => {
      if (!selectedRecipient || !recipientType)
        return { count: 0, results: [] };
      return await fetchUnpaidInvoices(
        selectedRecipient.id,
        recipientType as "tenant" | "owner"
      );
    },
    enabled: !!selectedRecipient && !!recipientType,
  });

  // Get available invoices for selected recipient
  const availableInvoices =
    selectedRecipient && unpaidInvoicesData ? unpaidInvoicesData.results : [];

  console.log("Available invoices:", availableInvoices);
  console.log("Transactions count:", transactions.length);

  // Fetch transactions using useQuery
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    isError: transactionsError,
    error: transactionsErrorObj,
  } = useQuery({
    queryKey: ["instant-payment-notifications", transactionSearchQuery],
    queryFn: async () => {
      // For now, we'll keep the paybill/buygoods logic but it should be updated
      // to work with account selection instead of payment method
      //return { error: false, data: [] };
    //},
    //enabled: false, // Disabled for now as we're replacing payment method with accounts
     return await fetchInstantPaymentNotifications({
        search_query: transactionSearchQuery
      });
    },
    enabled: formData.selectedAccount === "paybill/buygoods",
  });

  // Update transactions when API data changes
  useEffect(() => {
    if (transactionsData?.data && !transactionsData.error) {
      setTransactions(transactionsData.data);
    } else {
      setTransactions([]);
    }
  }, [transactionsData]);

  // Fetch user accounts using useQuery
  const {
    data: userAccountsData,
    isLoading: accountsLoading,
    isError: accountsError,
    error: accountsErrorObj,
  } = useQuery({
    queryKey: ["user-accounts", selectedRecipient?.id],
    queryFn: async () => {
      if (!selectedRecipient) return { error: false, data: [] };
      return await getUserAccounts(selectedRecipient.id);
    },
    enabled: !!selectedRecipient,
  });

  // Get available accounts for selected recipient
  const availableAccounts = userAccountsData?.data?.data?.results || [];

  console.log("Available accounts:", availableAccounts);
  // Get default currency
  const defaultCurrency = { code: "KES", symbol: "KES" };

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

  // Get available invoices for selected recipient
  // const availableInvoices = selectedRecipient ? invoices : [];

  const handleInputChange = (
    field: string,
    value: string | boolean | number | Date | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInvoiceSelection = (
    invoiceId: string,
    isSelected: boolean,
    appliedAmount?: number
  ) => {
    const invoice = availableInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const existingIndex = selectedInvoices.findIndex(
      (inv) => inv.id === invoiceId
    );

    let newAppliedAmount = appliedAmount;
    if (isSelected && appliedAmount === undefined) {
      // If selecting and no amount specified, use full invoice amount
      newAppliedAmount = 0;
    } else if (!isSelected) {
      // If deselecting, set amount to 0
      newAppliedAmount = 0;
    }

    // Validate that we don't exceed the invoice balance
    const invoiceBalance = parseFloat(String(invoice.balance));
    const finalAmount = Math.min(Number(newAppliedAmount) || 0, invoiceBalance);

    if (existingIndex >= 0) {
      // Update existing invoice
      const updatedInvoices = [...selectedInvoices];
      updatedInvoices[existingIndex] = {
        ...updatedInvoices[existingIndex],
        isSelected,
        appliedAmount: finalAmount,
      };
      setSelectedInvoices(updatedInvoices);
    } else {
      // Add new invoice
      setSelectedInvoices([
        ...selectedInvoices,
        {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          amount: Number(invoice.balance),
          appliedAmount: finalAmount,
          isSelected,
        },
      ]);
    }
  };

  const removeInvoice = (invoiceId: string) => {
    setSelectedInvoices(selectedInvoices.filter((inv) => inv.id !== invoiceId));
  };

  const calculateTotalAmountPaid = () => {
    // For now, we'll use invoice amounts only since we're replacing payment methods with accounts
    // This can be updated later to handle different account types
    return selectedInvoices
      .filter((invoice) => invoice.isSelected)
      .reduce((sum, invoice) => sum + invoice.appliedAmount, 0);
  };

  const calculateInvoiceAmount = () => {
    return selectedInvoices
      .filter((invoice) => invoice.isSelected)
      .reduce((sum, invoice) => sum + invoice.appliedAmount, 0);
  };

  // Validation helpers
  const hasSelectedInvoice = selectedInvoices.some((inv) => inv.isSelected);
  const hasSelectedTransaction = selectedTransactions.length > 0;
  const hasOverpayment = selectedInvoices.some((inv) => {
    if (!inv.isSelected) return false;
    const invoice = availableInvoices.find(
      (available) => available.id === inv.id
    );
    if (!invoice) return false;
    return inv.appliedAmount > parseFloat(String(invoice.balance));
  });
  const balance = Math.round(
    calculateTotalAmountPaid() - calculateInvoiceAmount()
  );
  const isBalanceZero = balance === 0;
  const canSubmit =
    (hasSelectedInvoice || hasSelectedTransaction) &&
    !hasOverpayment &&
    isBalanceZero;

  const queryClient = useQueryClient();
  // useMutation for submit (now uses real recordPayment action)
  const { mutate: submitPayment, isPending: isSubmitting } = useMutation({
    mutationFn: async (paymentData: CreatePaymentPayload) => {
      // Call the real recordPayment action
      return await recordPayment(paymentData);
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message || "Failed to record payment");
        return;
      }
      toast.success(data.message || "Payment recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["unpaid-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payment-table"] });
      onClose();
      // Reset form
      setFormData({
        tenantId: "",
        paymentDate: new Date(),
        selectedAccount: "",
        notes: "",
        sendReceipt: false,
      });
      setSelectedRecipient(null);
      setSelectedInvoices([]);
      setSearchQuery("");
    },
    onError: (error: Error) => {
      // Only for truly unexpected errors (network, code bugs)
      toast.error(error.message || "Unexpected error");
    },
  });

  const handleSubmit = async () => {
    let valid = true;
    if (!formData.selectedAccount) {
      setAccountError("Please choose an account.");
      valid = false;
    } else {
      setAccountError("");
    }
    if (!hasSelectedInvoice && !hasSelectedTransaction) {
      toast.error(
        "Please select at least one invoice or transaction to apply the payment."
      );
      valid = false;
    }
    if (!valid) return;
    
    // Get the selected account details
    const selectedAccount = availableAccounts.find((acc: any) => acc.id === formData.selectedAccount);
    
    console.log("Selected account:", selectedAccount);
    console.log("Account code being sent:", selectedAccount?.account_code);
    console.log("Account type fallback:", selectedAccount?.account_type);
    
    // Prepare payload for recordPayment action
    const paymentData: CreatePaymentPayload = {
      recipient: {
        id: selectedRecipient?.id || "",
        name: selectedRecipient?.name || "",
      },
      recipientType,
      paymentDate:
        formData.paymentDate instanceof Date
          ? formData.paymentDate.toISOString().slice(0, 10)
          : formData.paymentDate,
      paymentMethod: selectedAccount?.account_code || selectedAccount?.account_type || "bank", // Use account code, fallback to account type
      amountPaid: calculateTotalAmountPaid(),
      notes: formData.notes,
      sendReceipt: formData.sendReceipt,
      invoicesApplied: selectedInvoices
        .filter((inv) => inv.isSelected)
        .map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          appliedAmount: inv.appliedAmount,
        })),
      transactionsApplied: selectedTransactions.map((transaction) => ({
        id: transaction.id,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        merchant_code: transaction.merchant_code,
        business_short_code: transaction.business_short_code,
        invoice_number: transaction.invoice_number,
        payment_method: transaction.payment_method,
        trans_id: transaction.trans_id,
        third_party_trans_id: transaction.third_party_trans_id,
        full_name: transaction.full_name,
        first_name: transaction.first_name,
        middle_name: transaction.middle_name,
        last_name: transaction.last_name,
        transaction_type: transaction.transaction_type,
        msisdn: transaction.msisdn,
        org_account_balance: transaction.org_account_balance,
        trans_amount: transaction.trans_amount,
        trans_time: transaction.trans_time,
        bill_ref_number: transaction.bill_ref_number,
        is_verified: transaction.is_verified,
        verified_by: transaction.verified_by,
        verified_for: transaction.verified_for,
        verified_for_invoice: transaction.verified_for_invoice,
      })),
      totalApplied: calculateTotalAmountPaid(),
      balance: 0,
      status: 0 === 0 ? "PAID" : "PARTIAL",
    };
    submitPayment(paymentData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-4xl max-h-[calc(100vh-150px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Plus className="w-5 h-5" />
            Record New Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pr-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Payment Details Card */}
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="flex gap-3 items-center mb-4">
              <div className="flex justify-center items-center w-8 h-8 bg-green-100 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Payment Details</h3>
                <p className="text-sm text-gray-600">
                  Select recipient and payment information
                </p>
              </div>
            </div>
            {/* Responsive two-column grid for all inputs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Recipient Type Dropdown */}
              <div className="space-y-2 w-full">
                <Label
                  htmlFor="recipientType"
                  className="text-sm font-medium text-gray-700"
                >
                  Recipient Type
                </Label>
                <Select
                  value={recipientType}
                  onValueChange={(value) => {
                    setRecipientType(value as "tenant" | "owner");
                    setSearchQuery("");
                    setSelectedRecipient(null);
                    setSelectedInvoices([]); // Clear selected invoices when recipient type changes
                    setFormData(prev => ({ ...prev, selectedAccount: "" })); // Clear selected account
                  }}
                >
                  <SelectTrigger className="bg-white border border-gray-200 focus:border-green-300 focus:ring-1 focus:ring-green-200 w-full !h-10 transition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Recipient Search */}
              <div className="space-y-2 w-full">
                <Label
                  htmlFor="recipientSearch"
                  className="text-sm font-medium text-gray-700"
                >
                  {`Search ${
                    recipientType === "tenant" ? "Tenants" : "Owners"
                  }`}
                </Label>
                <div className="relative" ref={searchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                    <Input
                      placeholder={`Search ${
                        recipientType === "tenant" ? "tenants" : "owners"
                      }...`}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSearchResults(e.target.value.length >= 3);
                      }}
                      onFocus={() =>
                        setShowSearchResults(searchQuery.length >= 3)
                      }
                      className="bg-white pl-10 border-gray-200 w-full !h-10"
                    />
                  </div>
                  {/* Search Results Dropdown */}
                  {showSearchResults && (
                    <div className="overflow-y-auto absolute z-10 mt-1 w-full max-h-60 bg-white rounded-lg border shadow-lg">
                      {recipientsLoading && (
                        <div className="p-3 text-center text-gray-500">
                          Loading...
                        </div>
                      )}
                      {recipientsError && (
                        <div className="p-3 text-center text-red-500">
                          {recipientsError}
                        </div>
                      )}
                      {!recipientsLoading &&
                        recipients.length === 0 &&
                        searchQuery.length >= 3 && (
                          <div className="p-3 text-center text-gray-500">
                            No {recipientType}s found
                          </div>
                        )}
                      {recipients.map((recipient) => (
                        <div
                          key={recipient.id}
                          className="flex flex-col gap-1 p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 last:border-b-0"
                          onMouseDown={() => {
                            setSelectedRecipient({
                              id: recipient.id,
                              name: recipient.name,
                            });
                            setSearchQuery(recipient.name);
                            setShowSearchResults(false);
                            setSelectedInvoices([]); // Clear selected invoices when new recipient is selected
                          }}
                        >
                          <div className="font-medium">{recipient.name}</div>
                          <div className="text-sm text-gray-600">
                            {recipient.email}
                          </div>
                          {recipient.phone && (
                            <div className="text-sm text-gray-600">
                              {recipient.phone}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Account Selection */}
              <div className="space-y-2 w-full">
                <Label
                  htmlFor="paymentMethod"
                  className="text-sm font-medium text-gray-700"
                >
                  Payment Account
                </Label>
                <Select
                  value={formData.selectedAccount}
                  onValueChange={(value) => {
                    handleInputChange("selectedAccount", value);
                    setAccountError("");
                  }}
                  disabled={!selectedRecipient}
                >
                  <SelectTrigger
                    className={`w-full !h-10 ${
                      selectedRecipient
                        ? "bg-white border-gray-200"
                        : "bg-gray-100 border-gray-200 cursor-not-allowed"
                    }`}
                  >
                    <SelectValue
                      placeholder={
                        selectedRecipient
                          ? "Choose payment account"
                          : "Select a recipient first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_CHOICES.map((method) => (
                      <SelectItem key={method.code} value={method.code}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedRecipient && (
                  <p className="mt-1 text-xs text-gray-500">
                    Please select a recipient first
                  </p>
                )}
                {paymentMethodError && (
                  <p className="mt-1 text-xs text-red-500">
                    {paymentMethodError}
                  </p>
                )}
              </div>
              {/* Payment Date */}
              <div className="space-y-2 w-full">
                <Label
                  htmlFor="paymentDate"
                  className="text-sm font-medium text-gray-700"
                >
                  Payment Date
                </Label>
                <DatePicker
                  value={formData.paymentDate}
                  onChange={(date) => handleInputChange("paymentDate", date)}
                  minDate={new Date()}
                />
              </div>
            </div>
          </div>

          {/* Transaction Search Section - Only show when Paybill/BuyGoods is selected */}
          {formData.selectedAccount === "paybill/buygoods" && (
            <div className="flex flex-col gap-4 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
              <div className="flex gap-3 items-center mb-4">
                <div className="flex justify-center items-center w-8 h-8 bg-purple-100 rounded-lg">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Transaction Reference Search
                  </h3>
                  <p className="text-sm text-gray-600">
                    Search for payment transactions by mobile number or client
                    name
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Search Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Search Transactions
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="Search by mobile number or client full name..."
                      value={transactionSearchQuery}
                      onChange={(e) =>
                        setTransactionSearchQuery(e.target.value)
                      }
                      className="bg-white pr-12 pl-10 border-gray-200 w-full !h-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Clear search and reload all transactions without cache
                        setTransactionSearchQuery("");
                        queryClient.invalidateQueries({
                          queryKey: ["instant-payment-notifications"],
                        });
                      }}
                      disabled={transactionsLoading}
                      className="absolute right-2 top-1/2 p-1 w-8 h-8 -translate-y-1/2 hover:bg-gray-100"
                    >
                      <RefreshCw
                        className={`w-4 h-4 text-gray-500 ${
                          transactionsLoading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium text-gray-700">
                      Available Transactions
                    </Label>
                    <span className="text-xs text-gray-500">
                      {transactions.length} transaction
                      {transactions.length !== 1 ? "s" : ""} found
                      {selectedTransactions.length > 0 && (
                        <span className="ml-2 font-medium text-purple-600">
                          • {selectedTransactions.length} selected
                        </span>
                      )}
                    </span>
                  </div>

                  {transactionsLoading ? (
                    <div className="p-6 text-center bg-gray-50 rounded-lg border-2 border-gray-200 border-dashed">
                      <CreditCard className="mx-auto mb-2 w-8 h-8 text-gray-400 animate-spin" />
                      <p className="font-medium text-gray-600">
                        Loading transactions...
                      </p>
                    </div>
                  ) : transactionsError ? (
                    <div className="p-6 text-center bg-red-50 rounded-lg border-2 border-red-200 border-dashed">
                      <p className="font-medium text-red-700">
                        {transactionsErrorObj?.message ||
                          "Failed to fetch transactions"}
                      </p>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="p-6 text-center bg-gray-50 rounded-lg border-2 border-gray-200 border-dashed">
                      <CreditCard className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                      <p className="font-medium text-gray-600">
                        No transactions found
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Search for transactions using mobile number or client
                        name
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <div className="overflow-x-auto overflow-y-auto w-full max-h-96">
                        <table className="w-full min-w-[800px]">
                          <thead className="sticky top-0 z-10 bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 w-16 text-center">
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedTransactions.length ===
                                      transactions.length &&
                                    transactions.length > 0
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTransactions(transactions);
                                    } else {
                                      setSelectedTransactions([]);
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                              </th>
                              <th className="px-4 py-3 w-36 text-xs font-medium text-left text-gray-700">
                                Date & Time
                              </th>
                              <th className="px-4 py-3 w-48 text-xs font-medium text-left text-gray-700">
                                Customer Name
                              </th>
                              <th className="px-4 py-3 w-32 text-xs font-medium text-left text-gray-700">
                                Amount
                              </th>
                              <th className="px-4 py-3 w-28 text-xs font-medium text-left text-gray-700">
                                Payment Method
                              </th>
                              <th className="px-4 py-3 w-32 text-xs font-medium text-left text-gray-700">
                                Transaction ID
                              </th>
                              <th className="px-4 py-3 w-28 text-xs font-medium text-left text-gray-700">
                                Bill Ref
                              </th>
                              <th className="px-4 py-3 w-24 text-xs font-medium text-left text-gray-700">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map((transaction) => {
                              const isSelected = selectedTransactions.some(
                                (st) => st.id === transaction.id
                              );
                              return (
                                <tr
                                  key={transaction.id}
                                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                                    isSelected ? "bg-blue-50" : ""}`}
                                  onClick={(e) => {
                                    // Don't trigger if clicking on checkbox
                                    if (
                                      (e.target as HTMLElement).tagName ===
                                      "INPUT"
                                    ) {
                                      return;
                                    }
                                    setSelectedTransactions((prev) => {
                                      const isCurrentlySelected = prev.some(
                                        (st) => st.id === transaction.id
                                      );
                                      if (isCurrentlySelected) {
                                        return prev.filter(
                                          (st) => st.id !== transaction.id
                                        );
                                      } else {
                                        return [...prev, transaction];
                                      }
                                    });
                                  }}
                                >
                                  <td className="px-4 py-3 w-16 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setSelectedTransactions((prev) => {
                                          const isCurrentlySelected = prev.some(
                                            (st) => st.id === transaction.id
                                          );
                                          if (isCurrentlySelected) {
                                            return prev.filter(
                                              (st) => st.id !== transaction.id
                                            );
                                          } else {
                                            return [...prev, transaction];
                                          }
                                        });
                                      }}
                                      className="rounded border-gray-300"
                                    />
                                  </td>
                                  <td className="px-4 py-3 w-36">
                                    <div className="text-xs font-medium text-gray-700">
                                      {formatTransactionDate(
                                        transaction.trans_time
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 w-48">
                                    <div className="text-sm font-medium text-gray-900">
                                      {transaction.full_name ||
                                        transaction.first_name +
                                          " " +
                                          transaction.middle_name +
                                          " " +
                                          transaction.last_name}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 w-32">
                                    <div className="text-sm font-bold text-gray-900">
                                      KSH {transaction.trans_amount}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 w-28">
                                    <div className="text-sm text-gray-700">
                                      {transaction.payment_method}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 w-32">
                                    <div className="font-mono text-xs text-gray-700">
                                      {transaction.trans_id}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 w-28">
                                    <div className="font-mono text-xs text-gray-700">
                                      {transaction.bill_ref_number}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 w-24">
                                    <div className="flex gap-2 items-center">
                                      <div
                                        className={`w-2 h-2 rounded-full ${
                                          transaction.is_verified
                                            ? "bg-green-500"
                                            : "bg-yellow-500"
                                        }`}
                                      />
                                      <span className="text-xs font-medium">
                                        {transaction.is_verified
                                          ? "Verified"
                                          : "Unverified"}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Amount and Invoice Application */}
          <div className="flex flex-col gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex gap-3 items-center mb-4">
              <div className="flex justify-center items-center w-8 h-8 bg-blue-100 rounded-lg">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Payment Amount & Invoice Application
                </h3>
                <p className="text-sm text-gray-600">
                  Enter payment amount and apply to outstanding invoices
                </p>
              </div>
            </div>

            <div className="gap-4 w-full">
              {/* Amount Paid */}
              <div className="space-y-3">
                <Label
                  htmlFor="amountPaid"
                  className="text-sm font-medium text-gray-700"
                >
                  Amount Paid
                </Label>
                <Input
                  id="amountPaid"
                  type="text"
                  value={`${defaultCurrency.symbol} ${Math.round(
                    calculateTotalAmountPaid()
                  )}`}
                  readOnly
                  disabled
                  className="bg-gray-100 border-gray-200 !h-12 font-semibold text-lg cursor-not-allowed"
                  placeholder={`${defaultCurrency.symbol} 0`}
                />
                <p className="text-xs text-gray-500">
                  {formData.selectedAccount === "paybill/buygoods" &&
                  selectedTransactions.length > 0
                    ? "Amount from selected transactions - invoice amounts below only affect which invoices get paid"
                    : formData.selectedAccount === "paybill/buygoods" &&
                      selectedTransactions.length === 0
                    ? "Select transactions from the table above to set payment amount"
                    : selectedTransactions.length > 0
                    ? "This is the sum of selected transaction amounts"
                    : calculateInvoiceAmount() > 0
                    ? "This is the sum of all 'Amount to Apply' fields below"
                    : "Apply amounts to invoices below"}
                </p>
              </div>

              {/* Available Invoices */}
              <div className="space-y-3">
                <div className="">
                  <Label className="text-sm font-medium text-gray-700">
                    Outstanding Invoices
                  </Label>
                  {selectedRecipient && (
                    <span className="text-xs text-gray-500">
                      {availableInvoices.length} invoice
                      {availableInvoices.length !== 1 ? "s" : ""} available
                    </span>
                  )}
                </div>

                {invoicesLoading ? (
                  <div className="p-6 text-center bg-gray-50 rounded-lg border-2 border-gray-200 border-dashed">
                    <DollarSign className="mx-auto mb-2 w-8 h-8 text-gray-400 animate-spin" />
                    <p className="font-medium text-gray-600">
                      Loading invoices...
                    </p>
                  </div>
                ) : invoicesError ? (
                  <div className="p-6 text-center bg-red-50 rounded-lg border-2 border-red-200 border-dashed">
                    <p className="font-medium text-red-700">
                      {invoicesErrorObj?.message || "Failed to fetch invoices"}
                    </p>
                  </div>
                ) : !selectedRecipient ? (
                  <div className="p-6 text-center bg-gray-50 rounded-lg border-2 border-gray-200 border-dashed">
                    <DollarSign className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                    <p className="font-medium text-gray-600">
                      No Recipient Selected
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Select a recipient above to view their outstanding
                      invoices
                    </p>
                  </div>
                ) : availableInvoices.length === 0 ? (
                  <div className="p-6 text-center bg-green-50 rounded-lg border-2 border-green-200 border-dashed">
                    <CheckCircle className="mx-auto mb-2 w-8 h-8 text-green-400" />
                    <p className="font-medium text-green-700">
                      No Outstanding Invoices
                    </p>
                    <p className="mt-1 text-sm text-green-600">
                      This recipient has no unpaid invoices
                    </p>
                  </div>
                ) : (
                  <div className="grid overflow-y-auto grid-cols-2 gap-4 space-y-3 max-h-60">
                    {availableInvoices.map((invoice) => {
                      const selectedInvoice = selectedInvoices.find(
                        (inv) => inv.id === invoice.id
                      );
                      const isSelected = selectedInvoice?.isSelected || false;
                      const appliedAmount = selectedInvoice?.appliedAmount || 0;

                      return (
                        <div
                          key={invoice.id}
                          className={`bg-white p-4 border rounded-lg transition-colors ${
                            isSelected
                              ? "bg-blue-50 border-blue-300"
                              : "border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex gap-2 items-center mb-1">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) =>
                                    handleInvoiceSelection(
                                      invoice.id,
                                      checked as boolean
                                    )
                                  }
                                />
                                <span className="text-sm font-semibold text-gray-900">
                                  {invoice.invoice_number}
                                </span>
                                <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                                  Due: {invoice.due_date}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {/* Optionally show description if available */}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">
                                {defaultCurrency.symbol}
                                {invoice.balance}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-3 items-center">
                            <div className="flex-1">
                              <Label className="block mb-1 text-xs text-gray-600">
                                Amount to Apply
                              </Label>
                              <Input
                                type="number"
                                placeholder="0.00"
                                className="w-full !h-9 text-sm"
                                step="0.01"
                                min="0"
                                max={invoice.balance}
                                value={appliedAmount}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    handleInvoiceSelection(
                                      invoice.id,
                                      true,
                                      undefined
                                    );
                                  } else {
                                    const parsed = parseFloat(value);
                                    if (!isNaN(parsed) && parsed >= 0) {
                                      // Prevent overpayment - cannot pay more than the balance
                                      const maxAmount = parseFloat(
                                        String(invoice.balance)
                                      );
                                      const finalAmount = Math.min(
                                        parsed,
                                        maxAmount
                                      );
                                      handleInvoiceSelection(
                                        invoice.id,
                                        true,
                                        finalAmount
                                      );

                                      // Show warning if user tried to pay more than balance
                                      if (parsed > maxAmount) {
                                        toast.warning(
                                          `Cannot pay more than ${
                                            defaultCurrency.symbol
                                          }${maxAmount.toFixed(
                                            2
                                          )} for this invoice`
                                        );
                                      }
                                    }
                                  }
                                }}
                              />
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500">
                                Remaining
                              </div>
                              <div className="text-sm font-medium text-gray-700">
                                {defaultCurrency.symbol}
                                {invoice.balance}
                              </div>
                              {appliedAmount > 0 && (
                                <div className="text-xs text-green-600">
                                  Max: {defaultCurrency.symbol}
                                  {invoice.balance}
                                </div>
                              )}
                              {appliedAmount >
                                parseFloat(String(invoice.balance)) && (
                                <div className="text-xs font-medium text-red-600">
                                  Overpayment: {defaultCurrency.symbol}
                                  {(
                                    appliedAmount -
                                    parseFloat(String(invoice.balance))
                                  ).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected Invoices Summary */}
          {selectedInvoices.filter((inv) => inv.isSelected).length > 0 && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <h4 className="font-medium text-gray-900">Invoices Applied</h4>
                <span className="text-sm text-gray-500">
                  ({selectedInvoices.filter((inv) => inv.isSelected).length}{" "}
                  invoices)
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200">
                  <div className="col-span-4 p-3 text-sm font-medium text-gray-700 border-r border-gray-200">
                    Invoice #
                  </div>
                  <div className="col-span-3 p-3 text-sm font-medium text-center text-gray-700 border-r border-gray-200">
                    Total Amount
                  </div>
                  <div className="col-span-3 p-3 text-sm font-medium text-center text-gray-700 border-r border-gray-200">
                    Applied Amount
                  </div>
                  <div className="col-span-2 p-3 text-sm font-medium text-center text-gray-700">
                    Action
                  </div>
                </div>

                <div className="bg-white">
                  {selectedInvoices
                    .filter((inv) => inv.isSelected)
                    .map((invoice) => (
                      <div
                        key={invoice.id}
                        className="grid grid-cols-12 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="col-span-4 p-3 border-r border-gray-100">
                          <div className="text-sm font-medium">
                            {invoice.invoiceNumber}
                          </div>
                        </div>
                        <div className="flex col-span-3 justify-center items-center px-3 border-r border-gray-100">
                          <div className="text-sm font-medium text-gray-900">
                            {defaultCurrency.symbol}
                            {invoice.amount}
                          </div>
                        </div>
                        <div className="flex col-span-3 justify-center items-center px-3 border-r border-gray-100">
                          <div className="text-sm font-medium text-blue-600">
                            {defaultCurrency.symbol}
                            {invoice.appliedAmount}
                          </div>
                        </div>
                        <div className="flex col-span-2 justify-center items-center p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInvoice(invoice.id)}
                            className="p-1 w-8 h-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-sm text-gray-600">Amount Paid</div>
                <div className="text-2xl font-bold text-gray-900">
                  {defaultCurrency.symbol}{" "}
                  {Math.round(calculateTotalAmountPaid())}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Applied to Invoices</div>
                <div className="text-2xl font-bold text-blue-600">
                  {defaultCurrency.symbol}{" "}
                  {Math.round(calculateInvoiceAmount())}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Balance</div>
                <div
                  className={`text-2xl font-bold ${
                    Math.round(
                      calculateTotalAmountPaid() - calculateInvoiceAmount()
                    ) === 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {defaultCurrency.symbol}{" "}
                  {Math.round(
                    calculateTotalAmountPaid() - calculateInvoiceAmount()
                  )}
                </div>
                {Math.round(
                  calculateTotalAmountPaid() - calculateInvoiceAmount()
                ) !== 0 && (
                  <div className="mt-2 text-xs font-medium text-red-600">
                    Warning: Payment balance is not zero.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label
              htmlFor="notes"
              className="text-sm font-medium text-gray-700"
            >
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Optional notes about this payment..."
              className="bg-white border-gray-200"
              rows={3}
            />
          </div>

          {/* Overpayment Warning */}
          {hasOverpayment && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex gap-2 items-center">
                <div className="flex justify-center items-center w-5 h-5 bg-red-100 rounded-full">
                  <span className="text-xs font-bold text-red-600">!</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Overpayment Detected
                  </p>
                  <p className="text-xs text-red-600">
                    One or more invoices have payment amounts exceeding their
                    remaining balance. Please adjust the amounts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting || !formData.selectedAccount}
            >
              {isSubmitting
                ? "Recording..."
                : !isBalanceZero &&
                  (hasSelectedInvoice || hasSelectedTransaction)
                ? "Balance Must Be Zero"
                : !formData.selectedAccount
                ? "Select Account"
                : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentModal;
