"use client";

import { AlarmClock, Banknote, Calendar, FileText, Package } from 'lucide-react';
import React, { useState } from 'react';

import Header from '@/features/projects/profile/tabs/Components/structure/header';

import { TransactionDetailModal } from './components/TransactionDetailModal';
import TransactionTable from './components/TransactionTable';
import DateRangeFilter from './DateRangeFilter';
import { useTransactionsQuery } from './hooks/useTransactionsQuery';
import StatisticsBar from './StatisticsBar';

import type {
  TransactionsResponse,
  TransactionsSummary,
  Transaction,
} from "@/features/finance/transactions/schema";

// --- Types ---
// Remove local Transaction type and mock data

// Remove all mock data and the Summary interface if not used elsewhere

// --- Helpers ---
function isTransactionsResponse(
  data: unknown
): data is TransactionsResponse["data"] {
  return (
    typeof data === "object" &&
    data !== null &&
    "results" in data &&
    Array.isArray((data as TransactionsResponse["data"]).results)
  );
}

export default function TransactionsPage() {
  // --- State ---
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: new Date("2025-07-01"),
    to: new Date("2025-07-31"),
  });
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch transactions
  const { data, isLoading, isError } = useTransactionsQuery({
    date_from: dateRange.from.toISOString().split("T")[0],
    date_to: dateRange.to?.toISOString().split("T")[0],
  });

  // Defensive: fallback to empty array
  const transactions = isTransactionsResponse(data) ? data.results : [];
  const summary: TransactionsSummary | null =
    isTransactionsResponse(data) && "summary" in data
      ? (data as TransactionsResponse["data"]).summary
      : null;

  // Prepare stats for StatisticsBar using API summary
  const stats = summary
    ? [
        {
          icon: Banknote,
          title: "Total Income",
          value: summary.total_income,
          desc: "This Month",
        },
        {
          icon: FileText,
          title: "Outstanding",
          value: summary.outstanding,
          desc: "Unpaid",
        },
        {
          icon: AlarmClock,
          title: "Overdue",
          value: summary.overdue,
          desc: "Past Due",
        },
        {
          icon: Calendar,
          title: "Upcoming (7d)",
          value: summary.upcoming,
          desc: "Due Soon",
        },
        {
          icon: Package,
          title: "Expenses",
          value: summary.expenses,
          desc: "This Month",
        },
      ]
    : [];

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (isError)
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load transactions.
      </div>
    );

  return (
    <div className="p-4 mx-auto max-w-7xl md:p-8">
      <div className="mb-10">
        <Header
          title="Transactions"
          description="View and manage all transactions"
        >
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </Header>
      </div>
      <StatisticsBar stats={stats} />
      <TransactionTable data={transactions} onView={setSelectedTransaction} />
      <TransactionDetailModal
        open={detailOpen}
        transaction={selectedTransaction}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
