import { useEffect, useState } from 'react';

import { Header } from '@/features/clients/tabs/components';

import {
    AgentPayoutsSummary, DateRangeSelector, FinancialCollectionsSummary,
    OutstandingPaymentsFollowups, PropertySalesPerformance, SalesTeamPerformance,
} from './components';

const SalesReports = () => {
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Set default date range to current month on component mount
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setSelectedDateRange({
      from: firstDay.toISOString().split("T")[0], // YYYY-MM-DD format
      to: lastDay.toISOString().split("T")[0], // YYYY-MM-DD format
    });
  }, []);

  const handleDateRangeUpdate = (formattedRange: {
    from: string;
    to: string;
  }) => {
    setSelectedDateRange(formattedRange);
  };

  return (
    <div className="w-full h-full">
      <Header
        title="Sales Reports"
        description="View and generate sales reports"
      >
        <DateRangeSelector
          selectedDateRange={selectedDateRange}
          onDateRangeUpdate={handleDateRangeUpdate}
        />
      </Header>

      {/* Property Sales Performance Reports */}
      <div className="mt-8">
        <PropertySalesPerformance selectedDateRange={selectedDateRange} />
      </div>

      {/* Sales Team Performance Reports */}
      <div className="mt-12">
        <SalesTeamPerformance selectedDateRange={selectedDateRange} />
      </div>

      {/* Financial Collections Summary Reports */}
      <div className="mt-12">
        <FinancialCollectionsSummary selectedDateRange={selectedDateRange} />
      </div>

      {/* Outstanding Payments & Follow-ups Reports */}
      <div className="mt-12">
        <OutstandingPaymentsFollowups selectedDateRange={selectedDateRange} />
      </div>

      {/* Agent Payouts Summary Reports */}
      <div className="mt-12">
        <AgentPayoutsSummary selectedDateRange={selectedDateRange} />
      </div>
    </div>
  );
};

export default SalesReports;
