"use client";

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, CreditCard, X } from 'lucide-react';

import { fetchInstantPaymentNotifications } from '@/actions/finance/instanatPayments/indetx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TransactionNotification {
  id: string;
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

interface TransactionsModalProps {
  open: boolean;
  onClose: () => void;
}

const TransactionsModal = ({ open, onClose }: TransactionsModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<TransactionNotification[]>([]);
  const queryClient = useQueryClient();

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

  // Fetch transactions using useQuery
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    isError: transactionsError,
    error: transactionsErrorObj,
  } = useQuery({
    queryKey: ["instant-payment-notifications", searchQuery],
    queryFn: async () => {
      return await fetchInstantPaymentNotifications({
        search_query: searchQuery
      });
    },
    enabled: true,
  });

  // Update transactions when API data changes
  useEffect(() => {
    if (transactionsData?.data && !transactionsData.error) {
      setTransactions(transactionsData.data);
    } else {
      setTransactions([]);
    }
  }, [transactionsData]);

  const handleRefresh = () => {
    setSearchQuery("");
    queryClient.invalidateQueries({
      queryKey: ["instant-payment-notifications"],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-6xl max-h-[calc(100vh-100px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <CreditCard className="w-5 h-5" />
            All Transactions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pr-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Search Section */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex gap-3 items-center mb-4">
              <div className="flex justify-center items-center w-8 h-8 bg-blue-100 rounded-lg">
                <Search className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Search Transactions
                </h3>
                <p className="text-sm text-gray-600">
                  Search by mobile number, client name, or transaction ID
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
                    placeholder="Search by mobile number, client name, or transaction ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white pr-12 pl-10 border-gray-200 w-full !h-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
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
            </div>
          </div>

          {/* Transactions Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-gray-700">
                All Transactions
              </Label>
              <span className="text-xs text-gray-500">
                {transactions.length} transaction
                {transactions.length !== 1 ? "s" : ""} found
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
                  {searchQuery 
                    ? "Try adjusting your search terms"
                    : "Search for transactions using mobile number, client name, or transaction ID"
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="overflow-x-auto overflow-y-auto w-full max-h-96">
                  <table className="w-full min-w-[1000px]">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr>
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
                        <th className="px-4 py-3 w-20 text-xs font-medium text-left text-gray-700">
                          Phone
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 w-36 text-xs text-gray-900">
                            {formatTransactionDate(transaction.trans_time)}
                          </td>
                          <td className="px-4 py-3 w-48 text-xs text-gray-900">
                            <div className="font-medium">
                              {transaction.full_name || "N/A"}
                            </div>
                            <div className="text-gray-500">
                              {transaction.first_name && transaction.last_name
                                ? `${transaction.first_name} ${transaction.last_name}`
                                : "N/A"}
                            </div>
                          </td>
                          <td className="px-4 py-3 w-32 text-xs font-medium text-gray-900">
                            KSH {Number(transaction.trans_amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 w-28 text-xs text-gray-600">
                            {transaction.payment_method || "N/A"}
                          </td>
                          <td className="px-4 py-3 w-32 text-xs font-mono text-gray-600">
                            {transaction.trans_id || "N/A"}
                          </td>
                          <td className="px-4 py-3 w-28 text-xs font-mono text-gray-600">
                            {transaction.bill_ref_number || "N/A"}
                          </td>
                          <td className="px-4 py-3 w-24 text-center">
                            <div
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.is_verified
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              <span>
                                {transaction.is_verified
                                  ? "Verified"
                                  : "Unverified"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 w-20 text-xs text-gray-600">
                            {transaction.msisdn || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionsModal;

