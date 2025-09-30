import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  trans_id: string;
  amount: string;
  payment_method: string;
  trans_time: string;
  phone_number: string;
  account_reference: string;
  merchant_request_id: string;
  checkout_request_id: string;
  response_code: string;
  response_description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ApartmentStatus {
  [key: string]: {
    exists: boolean;
    apartment_id?: string;
    apartment_name?: string;
    project_id?: string;
    block_name?: string;
    floor_number?: number;
  };
}

interface TransactionsModalProps {
  open: boolean;
  onClose: () => void;
}

const TransactionsModal: React.FC<TransactionsModalProps> = ({ open, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [apartmentStatuses, setApartmentStatuses] = useState<ApartmentStatus>({});
  const [updatingBills, setUpdatingBills] = useState<{ [key: string]: boolean }>({});

  // Fetch transactions
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const response = await fetch('/api/transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      return response.json();
    },
    enabled: open,
  });

  const formatTransactionDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const detectApartmentNumber = (accountRef: string): string | null => {
    // Look for patterns like B101, A205, etc.
    const apartmentMatch = accountRef.match(/^[A-Z]\d{3}$/);
    return apartmentMatch ? apartmentMatch[0] : null;
  };

  const checkApartmentExists = async (apartmentNumber: string) => {
    try {
      const response = await fetch(`/api/properties/apartments/check?number=${apartmentNumber}`);
      const data = await response.json();
      
      return {
        exists: !data.error,
        apartment_id: data.data?.apartment_id,
        apartment_name: data.data?.apartment_name,
        project_id: data.data?.project_id,
        block_name: data.data?.block_name,
        floor_number: data.data?.floor_number,
      };
    } catch (error) {
      console.error('Error checking apartment:', error);
      return { exists: false };
    }
  };

  const updateUnpaidBills = async (transaction: Transaction, apartmentNumber: string) => {
    setUpdatingBills(prev => ({ ...prev, [transaction.id]: true }));
    
    try {
      const response = await fetch('/api/payments/update-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transaction.trans_id,
          apartment_number: apartmentNumber,
          amount: transaction.amount,
          payment_method: transaction.payment_method,
          trans_time: transaction.trans_time,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        toast.error(data.message || 'Failed to update bills');
      } else {
        toast.success(data.message || 'Bills updated successfully');
        // Refresh apartment status
        const status = await checkApartmentExists(apartmentNumber);
        setApartmentStatuses(prev => ({
          ...prev,
          [apartmentNumber]: status,
        }));
      }
    } catch (error) {
      console.error('Error updating bills:', error);
      toast.error('Failed to update bills');
    } finally {
      setUpdatingBills(prev => ({ ...prev, [transaction.id]: false }));
    }
  };

  // Check apartment statuses when transactions load
  useEffect(() => {
    if (transactions.length > 0) {
      const checkAllApartments = async () => {
        const statuses: ApartmentStatus = {};
        
        for (const transaction of transactions) {
          const apartmentNumber = detectApartmentNumber(transaction.account_reference);
          if (apartmentNumber) {
            const status = await checkApartmentExists(apartmentNumber);
            statuses[apartmentNumber] = status;
          }
        }
        
        setApartmentStatuses(statuses);
      };
      
      checkAllApartments();
    }
  }, [transactions]);

  const filteredTransactions = transactions.filter((transaction: Transaction) =>
    transaction.trans_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.amount.includes(searchTerm) ||
    transaction.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.phone_number.includes(searchTerm) ||
    transaction.account_reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transactions</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-600">Error loading transactions</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            All Transactions
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Transactions Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Ref
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Apartment Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction: Transaction) => {
                      const apartmentNumber = detectApartmentNumber(transaction.account_reference);
                      const apartmentStatus = apartmentNumber ? apartmentStatuses[apartmentNumber] : null;
                      
                      return (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-gray-900">
                            {transaction.trans_id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            KES {parseFloat(transaction.amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {transaction.payment_method}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {transaction.phone_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {transaction.account_reference}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {apartmentNumber ? (
                              apartmentStatus ? (
                                <div className="flex items-center gap-2">
                                  {apartmentStatus.exists ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Found
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Not Found
                                    </Badge>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {apartmentNumber}
                                  </span>
                                </div>
                              ) : (
                                <Badge variant="secondary">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Checking...
                                </Badge>
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">No apartment detected</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatTransactionDate(transaction.trans_time)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {apartmentNumber && apartmentStatus?.exists && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateUnpaidBills(transaction, apartmentNumber)}
                                disabled={updatingBills[transaction.id]}
                                className="text-xs"
                              >
                                {updatingBills[transaction.id] ? 'Updating...' : 'Update Bills'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionsModal;
