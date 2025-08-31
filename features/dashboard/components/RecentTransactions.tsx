"use client";
import {
    AlertTriangle, CreditCard, DollarSign, FileText, Receipt, TrendingDown,
} from 'lucide-react';

import { fetchRecentTransactions } from '@/actions/dahsboard';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

import { Transaction } from '../schema/dashboard';

export const RecentTransactions = () => {
  const {
    data: transactionsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: fetchRecentTransactions,
  });

  // Limit to last 10 transactions
  const transactions = (transactionsData?.data?.transactions || []).slice(0, 5);

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center bg-gray-50/50 p-4 rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gray-200 p-2 rounded-lg animate-pulse">
                <div className="bg-gray-300 rounded w-4 h-4" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="bg-gray-200 rounded w-32 h-4 animate-pulse" />
                <div className="bg-gray-200 rounded w-24 h-3 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="bg-gray-200 rounded w-16 h-4 animate-pulse" />
                <div className="bg-gray-200 mt-1 rounded w-12 h-3 animate-pulse" />
              </div>
              <div className="bg-gray-200 rounded w-16 h-6 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 bg-red-50 p-4 rounded-lg text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <h3 className="font-medium">Error loading transactions</h3>
            <p className="text-red-600 text-sm">
              Please try refreshing the page
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!transactions || transactions.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg text-gray-700">
          <FileText className="w-5 h-5" />
          <div>
            <h3 className="font-medium">No transactions available</h3>
            <p className="text-gray-600 text-sm">
              Recent transactions will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "failed":
        return "bg-gray-100 text-gray-800";
      case "partial":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "invoice":
        return FileText;
      case "expense":
        return Receipt;
      case "payment":
        return CreditCard;
      case "payout":
        return TrendingDown;
      default:
        return DollarSign;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4 p-4">
      {transactions.map((transaction: Transaction) => {
        const IconComponent = getTypeIcon(transaction.type);
        const isNegative = transaction.amount.startsWith("-");

        // Determine colors based on transaction type
        const getAmountColor = (type: string) => {
          switch (type) {
            case "receipt":
              return "text-green-600";
            case "invoice":
              return "text-yellow-600";
            case "expense":
            case "payout":
              return "text-red-600";
            default:
              return isNegative ? "text-red-600" : "text-green-600";
          }
        };

        const getIconBgColor = (type: string) => {
          switch (type) {
            case "receipt":
              return "bg-green-100";
            case "invoice":
              return "bg-yellow-100";
            case "expense":
            case "payout":
              return "bg-red-100";
            default:
              return isNegative ? "bg-red-100" : "bg-green-100";
          }
        };

        const getIconColor = (type: string) => {
          switch (type) {
            case "receipt":
              return "text-green-600";
            case "invoice":
              return "text-yellow-600";
            case "expense":
            case "payout":
              return "text-red-600";
            default:
              return isNegative ? "text-red-600" : "text-green-600";
          }
        };

        return (
          <div
            key={transaction.id}
            className="flex justify-between items-center bg-gray-50/50 hover:bg-gray-100/50 p-4 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-2 rounded-lg ${getIconBgColor(transaction.type)}`}
              >
                <IconComponent
                  className={`w-4 h-4 ${getIconColor(transaction.type)}`}
                />
              </div>

              <div className="flex flex-col">
                <div className="font-medium text-sm">{transaction.title}</div>
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  {transaction.tenant && (
                    <>
                      <span>Tenant: {transaction.tenant}</span>
                      <span>•</span>
                    </>
                  )}
                  {transaction.property && (
                    <>
                      <span>{transaction.property}</span>
                      <span>•</span>
                    </>
                  )}
                  {transaction.vendor && (
                    <>
                      <span>Vendor: {transaction.vendor}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{formatDate(transaction.date)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div
                  className={`font-semibold text-sm ${getAmountColor(
                    transaction.type
                  )}`}
                >
                  {transaction.amount}
                </div>
                <div className="text-gray-500 text-xs capitalize">
                  {transaction.type}
                </div>
              </div>

              <Badge className={getStatusColor(transaction.status)}>
                {transaction.status}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};
