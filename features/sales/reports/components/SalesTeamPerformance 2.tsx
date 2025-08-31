import { Clock, DollarSign, Download, Target, TrendingUp } from 'lucide-react';

import { getSalesTeamPerformance } from '@/actions/sales/reports/getSalesTeamPerformance';
import { DataTable } from '@/components/datatable/data-table';
import { Button } from '@/components/ui/button';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { exportReportToExcel } from '@/lib/excel-export';
import { useQuery } from '@tanstack/react-query';

import { columns, SalesPerson } from './columns';

interface SalesTeamPerformanceProps {
  selectedDateRange: {
    from: string;
    to: string;
  } | null;
}

export const SalesTeamPerformance = ({
  selectedDateRange,
}: SalesTeamPerformanceProps) => {
  // Fetch data using React Query
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "salesTeamPerformance",
      selectedDateRange?.from,
      selectedDateRange?.to,
    ],
    queryFn: () =>
      getSalesTeamPerformance({
        from_date: selectedDateRange?.from,
        to_date: selectedDateRange?.to,
      }),
    enabled: !!selectedDateRange, // Only fetch when date range is selected
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Debug logging
  console.log("=== SALES TEAM PERFORMANCE DEBUG ===");
  console.log("selectedDateRange:", selectedDateRange);
  console.log("reportData:", reportData);
  console.log("reportData?.success:", reportData?.success);
  if (reportData && "data" in reportData) {
    console.log("reportData.data:", reportData.data);
  }
  console.log("isLoading:", isLoading);
  console.log("error:", error);
  console.log("=====================================");

  // Helper function to format money
  const money = (x: number | undefined) => {
    if (!x || x === 0) return "KES 0";
    return `KES ${x.toLocaleString()}`;
  };

  // Helper function to format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Helper function to format time
  const formatTime = (days: number) => {
    if (days === 0) return "—";
    return `${days} days`;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 text-2xl">
              Sales Team Performance
            </h2>
            <p className="mt-1 text-gray-600">
              Who&apos;s closing? Where are we losing?
            </p>
          </div>
          <Button disabled className="gap-2">
            <Download className="w-4 h-4" />
            Export to Excel
          </Button>
        </div>

        <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-lg h-24 animate-pulse"
            />
          ))}
        </div>

        <div className="bg-gray-200 rounded-lg h-96 animate-pulse" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 text-2xl">
              Sales Team Performance
            </h2>
            <p className="mt-1 text-gray-600">
              Who&apos;s closing? Where are we losing?
            </p>
          </div>
          <Button disabled className="gap-2">
            <Download className="w-4 h-4" />
            Export to Excel
          </Button>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-100 py-16 border border-red-200 rounded-2xl text-center">
          <div className="flex justify-center items-center bg-red-100 mx-auto mb-4 rounded-full w-16 h-16">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-semibold text-red-800 text-xl">
            Error Loading Sales Team Data
          </h3>
          <p className="mb-4 text-red-600">
            {error instanceof Error
              ? error.message
              : "Failed to load sales team performance data"}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show no data state when no date range is selected
  if (!selectedDateRange) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 text-2xl">
              Sales Team Performance
            </h2>
            <p className="mt-1 text-gray-600">
              Who&apos;s closing? Where are we losing?
            </p>
          </div>
          <Button disabled className="gap-2">
            <Download className="w-4 h-4" />
            Export to Excel
          </Button>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16 border border-blue-200 rounded-2xl text-center">
          <div className="flex justify-center items-center bg-blue-100 mx-auto mb-4 rounded-full w-16 h-16">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-semibold text-blue-800 text-xl">
            Ready to View Sales Team Performance
          </h3>
          <p className="mx-auto mb-4 max-w-md text-blue-600">
            Select a date range above to analyze your sales team performance
            data
          </p>
          <div className="inline-flex items-center bg-blue-100 px-4 py-2 rounded-lg text-blue-700">
            <svg
              className="mr-2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Use the date picker to get started
          </div>
        </div>
      </div>
    );
  }

  // Check if we have successful data
  if (!reportData || !reportData.success) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-900 text-2xl">
              Sales Team Performance
            </h2>
            <p className="mt-1 text-gray-600">
              Who&apos;s closing? Where are we losing?
            </p>
          </div>
          <Button disabled className="gap-2">
            <Download className="w-4 h-4" />
            Export to Excel
          </Button>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-orange-100 py-16 border border-yellow-200 rounded-2xl text-center">
          <div className="flex justify-center items-center bg-yellow-100 mx-auto mb-4 rounded-full w-16 h-16">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-semibold text-yellow-800 text-xl">
            No Data Available
          </h3>
          <p className="mb-4 text-yellow-600">
            {reportData?.message ||
              "No sales team performance data found for the selected date range"}
          </p>
        </div>
      </div>
    );
  }

  const data = reportData.data!;

  // Debug the data structure
  console.log("=== DATA TRANSFORMATION DEBUG ===");
  console.log("data:", data);
  console.log("data.kpis:", data.kpis);
  console.log("data.salespeople:", data.salespeople);
  console.log("=====================================");

  // Transform data to match the datatable interface
  const tableData = (data.salespeople || []).map((person: any) => ({
    id: person.id,
    name: person.name,
    employee_id: person.employee_id,
    email: person.email,
    phone: person.phone,
    contracted: person.contracted,
    offersSent: person.offers_sent,
    won: person.won,
    lost: person.lost,
    conversionPercent: person.conversion_percent,
    avgDealSize: person.avg_deal_size,
    revenue: person.revenue,
  }));

  console.log("=== TABLE DATA DEBUG ===");
  console.log("tableData:", tableData);
  console.log("=========================");

  // Format data for DataTable component
  const formattedTableData = {
    data: {
      count: tableData.length,
      results: tableData,
    },
    error: false,
  };

  const exportToExcel = () => {
    if (reportData?.success && reportData.data) {
      try {
        const kpis = reportData.data.kpis;
        const tableData = reportData.data.salespeople || [];

        exportReportToExcel(
          "Sales Team Performance",
          kpis,
          tableData,
          selectedDateRange || undefined
        );
      } catch (error) {
        console.error("Error exporting to Excel:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-gray-900 text-2xl">
            Sales Team Performance
          </h2>
          <p className="mt-1 text-gray-600">
            Who&apos;s closing? Where are we losing?
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
          icon={Target}
          title="Total Deals Closed"
          value={(data.kpis?.total_deals_closed || 0).toLocaleString()}
          desc="Successfully closed deals"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Conversion Rate"
          value={formatPercent(data.kpis?.conversion_rate || 0)}
          desc="Leads to contracts"
        />
        <FeatureCard
          icon={DollarSign}
          title="Avg Deal Size"
          value={money(data.kpis?.avg_deal_size || 0)}
          desc="Average deal value"
        />
        <FeatureCard
          icon={Clock}
          title="Pipeline Velocity"
          value={formatTime(data.kpis?.pipeline_velocity || 0)}
          desc="Avg days per stage"
        />
      </div>

      {/* Second Row: Data Table */}
      <div>
        <DataTable
          columns={columns}
          data={formattedTableData}
          isLoading={false}
          isError={false}
          options={[]}
          tableKey="sales-team-performance"
          searchableColumnsSetters={[]}
        />
      </div>
    </div>
  );
};
