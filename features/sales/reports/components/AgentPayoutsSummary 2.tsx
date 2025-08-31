import { AlertCircle, Clock, DollarSign, Download, Percent, TrendingUp } from 'lucide-react';

import { getAgentPayouts } from '@/actions/sales/reports/getAgentPayouts';
import { DataTable } from '@/components/datatable/data-table';
import { Button } from '@/components/ui/button';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { exportReportToExcel } from '@/lib/excel-export';
import { useQuery } from '@tanstack/react-query';

import { agentPayoutsColumns } from './agentPayoutsColumns';

interface AgentPayoutsSummaryProps {
  selectedDateRange?: {
    from: string;
    to: string;
  } | null;
}

export const AgentPayoutsSummary = ({
  selectedDateRange,
}: AgentPayoutsSummaryProps) => {
  const {
    data: reportData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agentPayouts", selectedDateRange?.from, selectedDateRange?.to],
    queryFn: () =>
      getAgentPayouts({
        from_date: selectedDateRange?.from || undefined,
        to_date: selectedDateRange?.to || undefined,
      }),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Helper function to format money
  const money = (x: number | undefined) => {
    if (!x) return "—";
    return `KES ${x.toLocaleString()}`;
  };

  // Helper function to format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const exportToExcel = () => {
    if (reportData?.success && reportData.data) {
      try {
        const kpis = reportData.data.kpis;
        const tableData = reportData.data.agentPayouts;

        exportReportToExcel(
          "Agent Payouts Summary",
          kpis,
          tableData,
          selectedDateRange || undefined
        );
      } catch (error) {
        console.error("Error exporting to Excel:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 text-2xl">
              Agent Payouts Summary
            </h2>
            <p className="mt-1 text-gray-600">Loading agent payouts data...</p>
          </div>
        </div>
        <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-lg h-24 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !reportData?.success || !selectedDateRange) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 text-2xl">
              Agent Payouts Summary
            </h2>
            <p className="mt-1 text-gray-600">
              {!selectedDateRange
                ? "Please select a date range to view agent payouts"
                : "Unable to load agent payouts data"}
            </p>
          </div>
        </div>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto w-12 h-12 text-gray-400" />
          <h3 className="mt-4 font-medium text-gray-900 text-lg">
            No Agent Payouts Data Found
          </h3>
          <p className="mt-2 text-gray-500">
            {!selectedDateRange
              ? "Select a date range to view agent payouts data"
              : `No agent payouts found${
                  selectedDateRange
                    ? ` for ${selectedDateRange.from} - ${selectedDateRange.to}`
                    : ""
                }`}
          </p>
        </div>
      </div>
    );
  }

  const agentPayoutsData = reportData.data!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-gray-900 text-2xl">
            Agent Payouts Summary
          </h2>
          <p className="mt-1 text-gray-600">
            What it answers: What do we owe agents and what was paid?
          </p>
        </div>
        <Button onClick={exportToExcel} className="gap-2">
          <Download className="w-4 h-4" />
          Export to Excel
        </Button>
      </div>

      {/* First Row: Feature Cards */}
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={DollarSign}
          title="Accrued (Unpaid)"
          value={money(agentPayoutsData.kpis.accruedUnpaid)}
          desc="Total unpaid amounts"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Approved (Ready for Payout)"
          value={money(agentPayoutsData.kpis.approvedReady)}
          desc="Ready for payment"
        />
        <FeatureCard
          icon={Clock}
          title="Paid (Period)"
          value={money(agentPayoutsData.kpis.paidPeriod)}
          desc="Amount paid this period"
        />
        <FeatureCard
          icon={Percent}
          title="Avg Commission Rate"
          value={formatPercent(agentPayoutsData.kpis.avgCommissionRate)}
          desc="Average commission rate"
        />
      </div>

      {/* Second Row: Data Table */}
      <div>
        <DataTable
          columns={agentPayoutsColumns}
          data={{
            data: {
              count: agentPayoutsData.agentPayouts.length,
              results: agentPayoutsData.agentPayouts,
            },
          }}
          isLoading={false}
          isError={false}
          options={[]}
          tableKey="agent-payouts"
          searchableColumnIds={["agent", "projectName", "pending"]}
          searchableColumnsSetters={[() => {}, () => {}, () => {}]}
          searchPlaceholder="Search agent payouts..."
        />
      </div>
    </div>
  );
};
