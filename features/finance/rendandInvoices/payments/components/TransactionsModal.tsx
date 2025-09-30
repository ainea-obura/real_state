"use client";

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Search, RefreshCw, CreditCard, Building, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';

import { getTransactions, checkApartmentExists as checkApartmentExistsAction, updateUnpaidBills as updateUnpaidBillsAction } from '@/actions/finance/transactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import TransactionExcelUploadModal from './TransactionExcelUploadModal';

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
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<TransactionNotification[]>([]);
  const [apartmentStatuses, setApartmentStatuses] = useState<Record<string, 'checking' | 'exists' | 'not_found' | 'error'>>({});
  const [updatingBills, setUpdatingBills] = useState<Record<string, boolean>>({});
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
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
    queryKey: ["transactions", searchQuery],
    queryFn: async () => {
      return await getTransactions();
    },
    enabled: open && !!session?.accessToken,
  });

  // Update transactions when API data changes
  useEffect(() => {
    if (transactionsData?.data && !transactionsData.error) {
      // Convert our API format to the expected format
      const convertedTransactions = transactionsData.data.map((tx: any) => ({
        id: tx.id,
        payment_method: tx.payment_method,
        trans_id: tx.trans_id,
        third_party_trans_id: tx.merchant_request_id,
        full_name: tx.phone_number, // We'll use phone as name for now
        first_name: '',
        middle_name: '',
        last_name: '',
        transaction_type: 'CustomerPayBillOnline',
        msisdn: tx.phone_number,
        org_account_balance: '0',
        trans_amount: tx.amount,
        trans_time: tx.trans_time,
        bill_ref_number: tx.account_reference,
        is_verified: tx.status === 'completed',
        verified_by: null,
        verified_for: null,
        verified_for_invoice: null,
      }));
      setTransactions(convertedTransactions);
    } else {
      setTransactions([]);
    }
  }, [transactionsData]);

  const handleRefresh = () => {
    setSearchQuery("");
    queryClient.invalidateQueries({
      queryKey: ["transactions"],
    });
  };

  // Function to detect apartment number from bill_ref_number
  const detectApartmentNumber = (billRef: string): string | null => {
    if (!billRef) return null;
    
    // Return the bill_ref_number as-is for all transactions
    // This allows all transactions to be displayed regardless of naming structure
    return billRef.trim();
  };

  // Function to check if apartment exists
  const checkApartmentExists = async (apartmentNumber: string) => {
    setApartmentStatuses(prev => ({ ...prev, [apartmentNumber]: 'checking' }));
    
    try {
      if (!session?.accessToken) {
        setApartmentStatuses(prev => ({ ...prev, [apartmentNumber]: 'error' }));
        return;
      }
      
      const result = await checkApartmentExistsAction(apartmentNumber);
      setApartmentStatuses(prev => ({ ...prev, [apartmentNumber]: result.status as 'checking' | 'exists' | 'not_found' | 'error' }));
    } catch (error) {
      console.error('Error checking apartment:', error);
      setApartmentStatuses(prev => ({ ...prev, [apartmentNumber]: 'error' }));
    }
  };

  // Function to update unpaid bills for apartment
  const updateUnpaidBills = async (transaction: TransactionNotification, apartmentNumber: string) => {
    setUpdatingBills(prev => ({ ...prev, [transaction.id]: true }));
    
    try {
      if (!session?.accessToken) {
        toast.error('No access token available');
        return;
      }

      const result = await updateUnpaidBillsAction({
        transaction_id: transaction.trans_id,
        apartment_number: apartmentNumber,
        amount: transaction.trans_amount,
        payment_method: transaction.payment_method,
        trans_time: transaction.trans_time,
      });

      if (result.success) {
        toast.success(result.message);
        // Refresh transactions to show updated status
        queryClient.invalidateQueries({
          queryKey: ["transactions"],
        });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error updating bills:', error);
      toast.error('Error updating bills');
    } finally {
      setUpdatingBills(prev => ({ ...prev, [transaction.id]: false }));
    }
  };

  // Check apartments when transactions load
  useEffect(() => {
    transactions.forEach(transaction => {
      const apartmentNumber = detectApartmentNumber(transaction.bill_ref_number);
      if (apartmentNumber && !apartmentStatuses[apartmentNumber]) {
        checkApartmentExists(apartmentNumber);
      }
    });
  }, [transactions]);

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter(transaction => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      transaction.trans_id?.toLowerCase().includes(searchLower) ||
      transaction.msisdn?.toLowerCase().includes(searchLower) ||
      transaction.bill_ref_number?.toLowerCase().includes(searchLower) ||
      transaction.trans_amount?.toLowerCase().includes(searchLower) ||
      transaction.payment_method?.toLowerCase().includes(searchLower)
    );
  });

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
                    <RefreshCw className={`w-4 h-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium text-gray-700">
                  All Transactions
                </Label>
                <Button
                  onClick={() => setIsExcelModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Upload Excel
                </Button>
              </div>
              <span className="text-xs text-gray-500">
                {filteredTransactions.length} transaction
                {filteredTransactions.length !== 1 ? "s" : ""} found
              </span>
            </div>

            {transactionsLoading ? (
              <div className="p-6 text-center bg-gray-50 rounded-lg border-2 border-gray-200 border-dashed">
                <Loader2 className="mx-auto mb-2 w-8 h-8 text-blue-600 animate-spin" />
                <p className="font-medium text-gray-600">
                  Loading transactions...
                </p>
              </div>
            ) : transactionsError ? (
              <div className="p-6 text-center bg-red-50 rounded-lg border-2 border-red-200 border-dashed">
                <AlertCircle className="mx-auto mb-2 w-8 h-8 text-red-500" />
                <p className="font-medium text-red-700">
                  {transactionsErrorObj?.message ||
                    "Failed to fetch transactions"}
                </p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-6 text-center bg-gray-50 rounded-lg border-2 border-gray-200 border-dashed">
                <CreditCard className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                <p className="font-medium text-gray-600">
                  No transactions found
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery ? "Try adjusting your search terms" : "No transactions available"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 w-32 text-xs font-medium text-left text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-3 w-24 text-xs font-medium text-left text-gray-700">
                        Transaction ID
                      </th>
                      <th className="px-4 py-3 w-20 text-xs font-medium text-left text-gray-700">
                        Amount
                      </th>
                      <th className="px-4 py-3 w-20 text-xs font-medium text-left text-gray-700">
                        Method
                      </th>
                      <th className="px-4 py-3 w-24 text-xs font-medium text-left text-gray-700">
                        Account Ref
                      </th>
                      <th className="px-4 py-3 w-24 text-xs font-medium text-left text-gray-700">
                        Apartment Status
                      </th>
                      <th className="px-4 py-3 w-24 text-xs font-medium text-left text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.map((transaction) => {
                      const apartmentNumber = detectApartmentNumber(transaction.bill_ref_number);
                      const apartmentStatus = apartmentNumber ? apartmentStatuses[apartmentNumber] : null;
                      const isUpdating = updatingBills[transaction.id] || false;

                      return (
                        <tr
                          key={transaction.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 w-36 text-xs text-gray-900">
                            {formatTransactionDate(transaction.trans_time)}
                          </td>
                          <td className="px-4 py-3 w-24 text-xs font-mono text-gray-900">
                            {transaction.trans_id}
                          </td>
                          <td className="px-4 py-3 w-20 text-xs text-gray-900 font-medium">
                            KES {parseFloat(transaction.trans_amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 w-20 text-xs text-gray-900">
                            {transaction.payment_method}
                          </td>
                          <td className="px-4 py-3 w-24 text-xs text-gray-900">
                            {transaction.bill_ref_number}
                          </td>
                          <td className="px-4 py-3 w-24 text-xs">
                            {apartmentNumber ? (
                              <div className="flex items-center gap-2">
                                {apartmentStatus === 'checking' && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Checking...
                                  </Badge>
                                )}
                                {apartmentStatus === 'exists' && (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Found
                                  </Badge>
                                )}
                                {apartmentStatus === 'not_found' && (
                                  <Badge variant="destructive">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Not Found
                                  </Badge>
                                )}
                                {apartmentStatus === 'error' && (
                                  <Badge variant="destructive">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Error
                                  </Badge>
                                )}
                                <span className="text-xs text-gray-500">
                                  {apartmentNumber}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">No apartment detected</span>
                            )}
                          </td>
                          <td className="px-4 py-3 w-24 text-xs">
                            {apartmentNumber && apartmentStatus === 'exists' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateUnpaidBills(transaction, apartmentNumber)}
                                disabled={isUpdating}
                                className="text-xs"
                              >
                                {isUpdating ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  'Update Bills'
                                )}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Excel Upload Modal */}
      <TransactionExcelUploadModal
        open={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onTransactionsUpdated={() => {
          // Refresh transactions when Excel upload is successful
          queryClient.invalidateQueries({ queryKey: ['instant-payment-notifications'] });
        }}
      />
    </Dialog>
  );
};

export default TransactionsModal;

