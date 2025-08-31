import { AlertCircle, Clock, DollarSign, Download, TrendingUp } from 'lucide-react';

import { getOutstandingPayments } from '@/actions/sales/reports/getOutstandingPayments';
import { DataTable } from '@/components/datatable/data-table';
import { Button } from '@/components/ui/button';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { exportReportToExcel } from '@/lib/excel-export';
import { useQuery } from '@tanstack/react-query';

import { outstandingPaymentsColumns } from './columns';

interface OutstandingPaymentsFollowupsProps {
  selectedDateRange?: {
    from: string;
    to: string;
  } | null;
}

export const OutstandingPaymentsFollowups = ({
  selectedDateRange,
}: OutstandingPaymentsFollowupsProps) => {
  // Fetch data using React Query
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "outstandingPayments",
      selectedDateRange?.from,
      selectedDateRange?.to,
    ],
    queryFn: () =>
      getOutstandingPayments({
        from_date: selectedDateRange?.from || undefined,
        to_date: selectedDateRange?.to || undefined,
      }),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  console.log("=== OUTSTANDING PAYMENTS DEBUG ===");
  console.log("selectedDateRange:", selectedDateRange);
  console.log("reportData:", reportData);
  console.log("isLoading:", isLoading);
  console.log("error:", error);
  console.log("=====================================");

  // Helper function to format money
  const money = (x: number | undefined) => {
    if (!x) return "KES 0";
    return `KES ${x.toLocaleString()}`;
  };

  // Helper function to format time
  const formatTime = (days: number) => {
    if (days === 0) return "0 days";
    return `${days} days`;
  };

  const exportToExcel = () => {
    if (reportData?.success && reportData.data) {
      try {
        const kpis = reportData.data.kpis;
        const tableData = reportData.data.overduePayments;

        exportReportToExcel(
          "Outstanding Payments & Follow-ups",
          kpis,
          tableData,
          selectedDateRange || undefined
        );
      } catch (error) {
        console.error("Error exporting to Excel:", error);
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 text-2xl">
              Outstanding Payments
            </h2>
            <p className="mt-1 text-gray-600">
              Loading outstanding payments data...
            </p>
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

  // Error state or no date range
  if (error || !reportData?.success || !selectedDateRange) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 text-2xl">
              Outstanding Payments
            </h2>
            <p className="mt-1 text-gray-600">
              {!selectedDateRange
                ? "Please select a date range to view outstanding payments"
                : "Unable to load outstanding payments data"}
            </p>
          </div>
        </div>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto w-12 h-12 text-gray-400" />
          <h3 className="mt-4 font-medium text-gray-900 text-lg">
            No Outstanding Payments Data Found
          </h3>
          <p className="mt-2 text-gray-500">
            {!selectedDateRange
              ? "Select a date range to view outstanding payments"
              : `No outstanding payments found${
                  selectedDateRange
                    ? ` for ${selectedDateRange.from} - ${selectedDateRange.to}`
                    : ""
                }`}
          </p>
        </div>
      </div>
    );
  }

  // Get data safely
  const outstandingData = reportData.data!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-gray-900 text-2xl">
            Outstanding Payments
          </h2>
          <p className="mt-1 text-gray-600">
            Who owes money and who needs a nudge?
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
          icon={AlertCircle}
          title="Overdue Invoices (#)"
          value={outstandingData.kpis.overdueInvoicesCount.toLocaleString()}
          desc="Number of overdue invoices"
        />
        <FeatureCard
          icon={DollarSign}
          title="Overdue Amount (Total)"
          value={money(outstandingData.kpis.overdueAmountTotal)}
          desc="Total overdue amount"
        />
        <FeatureCard
          icon={Clock}
          title="Avg Days Overdue"
          value={formatTime(outstandingData.kpis.avgDaysOverdue)}
          desc="Average days overdue"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Leads Without Follow-up"
          value={outstandingData.kpis.leadsWithoutFollowup.toLocaleString()}
          desc="SLA breach count"
        />
      </div>

      {/* Second Row: Combined Data Table */}
      <div>
        <DataTable
          columns={outstandingPaymentsColumns}
          data={{
            data: {
              count: outstandingData.overduePayments.length,
              results: outstandingData.overduePayments.map((payment) => ({
                ...payment,
                lastReminder: payment.lastFollowUpDate || null, // Map to expected field
              })),
            },
          }}
          isLoading={false}
          isError={false}
          options={[]}
          tableKey="outstanding-payments"
          searchableColumnIds={[
            "invoiceNumber",
            "buyer",
            "projectName",
            "salesperson",
            "dueDate",
          ]}
          searchableColumnsSetters={[
            () => {},
            () => {},
            () => {},
            () => {},
            () => {},
          ]}
          searchPlaceholder="Search outstanding payments..."
        />
      </div>
    </div>
  );
};
