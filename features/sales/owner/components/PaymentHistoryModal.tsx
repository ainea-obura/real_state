import { AlertCircle, Calendar, CheckCircle, Clock, DollarSign, TrendingUp, X } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerProperty: any;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  ownerProperty,
}) => {
  const [filterPeriod, setFilterPeriod] = useState("all");

  if (!isOpen) return null;

  const mockPaymentHistory = [
    {
      id: 1,
      date: "15 Nov 2024",
      amount: 450000,
      type: "Installment",
      status: "completed",
      method: "Bank Transfer",
      reference: "TXN-2024-001",
      notes: "Monthly installment payment",
      lateFee: 0,
    },
    {
      id: 2,
      date: "15 Oct 2024",
      amount: 450000,
      type: "Installment",
      status: "completed",
      method: "Bank Transfer",
      reference: "TXN-2024-002",
      notes: "Monthly installment payment",
      lateFee: 0,
    },
    {
      id: 3,
      date: "15 Sep 2024",
      amount: 450000,
      type: "Installment",
      status: "completed",
      method: "Mobile Money",
      reference: "TXN-2024-003",
      notes: "Monthly installment payment",
      lateFee: 0,
    },
    {
      id: 4,
      date: "15 Aug 2024",
      amount: 450000,
      type: "Installment",
      status: "completed",
      method: "Bank Transfer",
      reference: "TXN-2024-004",
      notes: "Monthly installment payment",
      lateFee: 0,
    },
    {
      id: 5,
      date: "15 Jul 2024",
      amount: 450000,
      type: "Installment",
      status: "completed",
      method: "Bank Transfer",
      reference: "TXN-2024-005",
      notes: "Monthly installment payment",
      lateFee: 0,
    },
    {
      id: 6,
      date: "15 Jun 2024",
      amount: 450000,
      type: "Installment",
      status: "completed",
      method: "Mobile Money",
      reference: "TXN-2024-006",
      notes: "Monthly installment payment",
      lateFee: 0,
    },
    {
      id: 7,
      date: "15 May 2024",
      amount: 450000,
      type: "Installment",
      status: "completed",
      method: "Bank Transfer",
      reference: "TXN-2024-007",
      notes: "Monthly installment payment",
      lateFee: 0,
    },
    {
      id: 8,
      date: "15 Apr 2024",
      amount: 450000,
      type: "Installment",
      status: "completed",
      method: "Bank Transfer",
      reference: "TXN-2024-008",
      notes: "Monthly installment payment",
      lateFee: 0,
    },
    {
      id: 9,
      date: "15 Mar 2024",
      amount: 450000,
      type: "Installment",
      status: "completed",
      method: "Mobile Money",
      reference: "TXN-2024-009",
      notes: "Monthly installment payment",
      lateFee: 0,
    },
    {
      id: 10,
      date: "15 Feb 2024",
      amount: 450000,
      type: "Installment",
      status: "completed",
      method: "Bank Transfer",
      reference: "TXN-2024-010",
      notes: "Monthly installment payment",
      lateFee: 0,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const totalPaid = mockPaymentHistory.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const totalLateFees = mockPaymentHistory.reduce(
    (sum, payment) => sum + payment.lateFee,
    0
  );
  const onTimePayments = mockPaymentHistory.filter(
    (payment) => payment.lateFee === 0
  ).length;
  const totalPayments = mockPaymentHistory.length;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-xl">
                Payment History
              </h2>
              <p className="text-gray-600 text-sm">
                {ownerProperty?.ownerName} - {ownerProperty?.propertyName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Summary Cards */}
          <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
            <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-600 text-sm">
                    Total Paid
                  </p>
                  <p className="font-bold text-blue-900 text-xl">
                    KES {totalPaid.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-600 text-sm">On Time</p>
                  <p className="font-bold text-green-900 text-xl">
                    {onTimePayments}/{totalPayments}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-4 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-orange-600 text-sm">
                    Late Fees
                  </p>
                  <p className="font-bold text-orange-900 text-xl">
                    KES {totalLateFees.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-purple-600 text-sm">
                    Progress
                  </p>
                  <p className="font-bold text-purple-900 text-xl">
                    {ownerProperty?.installmentPlan?.completedInstallments}/
                    {ownerProperty?.installmentPlan?.totalInstallments}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 text-sm">
                Filter Period:
              </span>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Late Fee
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockPaymentHistory.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {payment.date}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 text-sm whitespace-nowrap">
                        KES {payment.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {payment.type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          <Badge
                            variant="outline"
                            className={getStatusColor(payment.status)}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {payment.method}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 text-sm whitespace-nowrap">
                        {payment.reference}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                        {payment.lateFee > 0 ? (
                          <span className="font-medium text-red-600">
                            KES {payment.lateFee.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs text-gray-600 text-sm truncate">
                        {payment.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 bg-gray-50 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            Export History
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;
