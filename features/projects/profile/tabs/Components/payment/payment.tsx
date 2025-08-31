import { ArrowUpCircle, Calculator, Coins } from 'lucide-react';
import { useState } from 'react';

import { fetchPaymentReport } from '@/actions/projects/payment';
import { DateRangePicker } from '@/components/date-range-picker';
import Header from '@/features/projects/profile/tabs/Components/structure/header';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { useQuery } from '@tanstack/react-query';

const Payment = ({ projectId }: { projectId: string }) => {
  // Date range state
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  // Handler for date range picker
  const handleDateRangeUpdate = (values: {
    range: { from?: Date; to?: Date };
  }) => {
    setDateRange(values.range);
  };

  const from = dateRange.from
    ? typeof dateRange.from === "string"
      ? dateRange.from
      : dateRange.from.toISOString().slice(0, 10)
    : undefined;
  const to = dateRange.to
    ? typeof dateRange.to === "string"
      ? dateRange.to
      : dateRange.to.toISOString().slice(0, 10)
    : undefined;

  const {
    data,
    isLoading: loading,
    isError,
    error,
  } = useQuery({
    queryKey: ["payment-report", projectId, from, to],
    queryFn: () => fetchPaymentReport({ projectId, from, to }),
    enabled: !!projectId,
  });

  const stats = data?.stats;
  const recentInvoices = data?.recentInvoices || [];
  const recentExpenses = data?.recentExpenses || [];

  return (
    <div className="space-y-6">
      {/* Header with title/description and date range picker on the right */}
      <Header
        title="Project Payment Report"
        description="View all money in and out for this project. Filter by date range to see income, expenses, and net balance."
      >
        <div className="flex items-center gap-3">
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={handleDateRangeUpdate}
            showCompare={false}
          />
        </div>
      </Header>

      {/* Stat Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={Coins}
          title="Total Income"
          value={loading ? "..." : stats?.totalIncome || "-"}
          desc="All money received"
        />
        <FeatureCard
          icon={ArrowUpCircle}
          title="Total Expenses"
          value={loading ? "..." : stats?.totalExpenses || "-"}
          desc="All money spent"
        />
        <FeatureCard
          icon={Calculator}
          title="Net Balance"
          value={loading ? "..." : stats?.netBalance || "-"}
          desc="Income minus expenses"
        />
      </div>

      {/* Error message */}
      {isError && (
        <div className="font-medium text-red-500">
          {(error as Error)?.message || "Failed to load payment report"}
        </div>
      )}

      {/* Recent Activity */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-2 mt-6">
        {/* Recent Invoices */}
        <div className="p-4 border rounded-lg w-full min-h-26">
          <div className="flex flex-col w-full min-w-0">
            <h1 className="mb-1 font-semibold text-primary text-base">
              Recent Invoices
            </h1>
            <ul className="space-y-2 mt-1 pr-2 h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {loading ? (
                <li className="text-gray-400">Loading...</li>
              ) : recentInvoices.length === 0 ? (
                <li className="text-gray-400">No invoices found.</li>
              ) : (
                recentInvoices.map((inv) => (
                  <li
                    key={inv.number + inv.date}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-gray-800">
                        {inv.number}{" "}
                        <span
                          className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                            inv.status === "PAID"
                              ? "bg-green-100 text-green-800"
                              : inv.status === "PARTIAL"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {inv.status.charAt(0).toUpperCase() +
                            inv.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <div className="text-gray-500 text-sm">
                        {inv.recipient}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary">
                        {inv.amount}
                      </div>
                      <div className="text-gray-400 text-xs">{inv.date}</div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        {/* Recent Expenses */}
        <div className="p-4 border rounded-lg w-full min-h-26">
          <div className="flex flex-col w-full min-w-0">
            <h1 className="mb-1 font-semibold text-primary text-base">
              Recent Expenses
            </h1>
            <ul className="space-y-2 mt-1 pr-2 h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {loading ? (
                <li className="text-gray-400">Loading...</li>
              ) : recentExpenses.length === 0 ? (
                <li className="text-gray-400">No expenses found.</li>
              ) : (
                recentExpenses.map((exp) => (
                  <li
                    key={exp.number + exp.date}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-gray-800">
                        {exp.number}{" "}
                        <span
                          className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                            exp.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : exp.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : exp.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {exp.status.charAt(0).toUpperCase() +
                            exp.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <div className="text-gray-500 text-sm">{exp.vendor}</div>
                      <div className="text-gray-400 text-xs">{exp.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary">
                        {exp.amount}
                      </div>
                      <div className="text-gray-400 text-xs">{exp.date}</div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
