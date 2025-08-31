import { AlertCircle, Clock, DollarSign, Download, TrendingUp } from 'lucide-react';

import { getFinancialCollections } from '@/actions/sales/reports/getFinancialCollections';
import { Button } from '@/components/ui/button';
import { ChartLineMultiple } from '@/components/ui/chart-line-multiple';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { exportReportToExcel } from '@/lib/excel-export';
import { useQuery } from '@tanstack/react-query';

interface FinancialCollectionsSummaryProps {
  selectedDateRange?: {
    from: string;
    to: string;
  } | null;
}

export const FinancialCollectionsSummary = ({
  selectedDateRange,
}: FinancialCollectionsSummaryProps) => {
  // Fetch data using React Query
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "financialCollections",
      selectedDateRange?.from,
      selectedDateRange?.to,
    ],
    queryFn: () =>
      getFinancialCollections({
        from_date: selectedDateRange?.from || undefined,
        to_date: selectedDateRange?.to || undefined,
      }),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  console.log("=== FINANCIAL COLLECTIONS DEBUG ===");
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

  // Helper function to format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Chart configuration for financial collections
  const chartConfig = {
    expected: {
      label: "Expected",
      color: "#f59e0b",
    },
    collected: {
      label: "Collected",
      color: "#10b981",
    },
  };

  const exportToExcel = () => {
    if (reportData?.success && reportData.data) {
      try {
        const kpis = reportData.data.kpis;
        const tableData = reportData.data.monthlyData || [];

        exportReportToExcel(
          "Financial Collections Summary",
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
              Financial Collections Summary
            </h2>
            <p className="mt-1 text-gray-600">Loading financial data...</p>
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
              Financial Collections Summary
            </h2>
            <p className="mt-1 text-gray-600">
              {!selectedDateRange
                ? "Please select a date range to view financial data"
                : "Unable to load financial data"}
            </p>
          </div>
        </div>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto w-12 h-12 text-gray-400" />
          <h3 className="mt-4 font-medium text-gray-900 text-lg">
            No Financial Data Found
          </h3>
          <p className="mt-2 text-gray-500">
            {!selectedDateRange
              ? "Select a date range to view collections data"
              : `No collections data found${
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
  const financialData = reportData.data!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-gray-900 text-2xl">
            Financial Collections Summary
          </h2>
          <p className="mt-1 text-gray-600">
            How much did we collect vs expected?
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
          title="Expected (Period)"
          value={money(financialData.kpis.expectedPeriod)}
          desc="Total expected collections"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Collected (Period)"
          value={money(financialData.kpis.collectedPeriod)}
          desc="Total collected amount"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Collection Rate %"
          value={formatPercent(financialData.kpis.collectionRate)}
          desc="Collection efficiency"
        />
        <FeatureCard
          icon={AlertCircle}
          title="Overdue Amount"
          value={money(financialData.kpis.overdueAmount)}
          desc="Amount past due date"
        />
      </div>

      {/* Second Row: Chart */}
      <div className="w-full">
        <div className="relative px-4 pt-8 border rounded-2xl w-full">
          {/* Stat summary */}
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="font-medium text-gray-500 text-xs">
                Financial Collections
              </div>
              <div className="font-bold text-gray-900 text-4xl">
                {formatPercent(financialData.kpis.collectionRate)}
              </div>
              <div className="text-gray-500 text-sm">
                Collection rate vs expected by month
              </div>
            </div>
          </div>
          {/* Chart */}
          <ChartLineMultiple
            chartData={financialData.monthlyData}
            chartConfig={chartConfig}
            title="Financial Collections"
            description="Expected vs Collected over time"
          />
        </div>
      </div>
    </div>
  );
};
