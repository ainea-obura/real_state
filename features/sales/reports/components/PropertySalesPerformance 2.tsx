import { Download, TrendingUp } from 'lucide-react';

import { getPropertySalesPerformance } from '@/actions/sales/reports/getPropertySalesPerformance';
import { Button } from '@/components/ui/button';
import { ChartLineMultiple } from '@/components/ui/chart-line-multiple';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { exportReportToExcel } from '@/lib/excel-export';
import { useQuery } from '@tanstack/react-query';

interface PropertySalesPerformanceProps {
  selectedDateRange: {
    from: string;
    to: string;
  } | null;
  onResetToCurrentMonth?: () => void;
}

export const PropertySalesPerformance = ({
  selectedDateRange,
}: PropertySalesPerformanceProps) => {
  // Fetch data using React Query
  const {
    data: reportData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["propertySalesPerformance", selectedDateRange],
    queryFn: () =>
      getPropertySalesPerformance({
        from_date: selectedDateRange?.from,
        to_date: selectedDateRange?.to,
      }),
    enabled: !!selectedDateRange, // Only fetch when date range is selected
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper function to format money
  const money = (x: number | undefined) => {
    if (!x || x === 0) return "KES 0";
    return `KES ${x.toLocaleString()}`;
  };

  // Helper function to format time
  const formatTime = (days: number) => {
    if (!days || days === 0) return "0 days";
    return `${days} days`;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-lg h-24 animate-pulse"
            />
          ))}
        </div>
        <div className="bg-gray-200 rounded-2xl h-96 animate-pulse" />
      </div>
    );
  }

  // Show error state
  if (error || !reportData?.success) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 py-16 border border-amber-200 rounded-2xl text-center">
          <div className="flex justify-center items-center bg-amber-100 mx-auto mb-4 rounded-full w-16 h-16">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-semibold text-amber-800 text-xl">
            No Sales Data Found
          </h3>
          <div className="mb-6 text-amber-700">
            <p className="mb-2">
              <span className="font-medium">Selected Date Range:</span>
            </p>
            <div className="inline-flex items-center bg-amber-200 px-4 py-2 rounded-lg font-mono text-amber-800 text-sm">
              {selectedDateRange?.from} → {selectedDateRange?.to}
            </div>
          </div>
          <p className="mx-auto mb-6 max-w-md text-amber-600">
            There are no sales records for the selected period. This could mean:
          </p>
          <ul className="inline-block mx-auto mb-6 max-w-md text-amber-600 text-sm text-left">
            <li className="mb-1">
              • No properties were sold during this period
            </li>
            <li className="mb-1">• Sales data hasn&apos;t been entered yet</li>
            <li className="mb-1">• The date range is outside available data</li>
          </ul>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-600 hover:bg-amber-700 px-6 py-3 rounded-lg font-medium text-white transition-colors"
            >
              Refresh Data
            </button>
            <button
              onClick={() => {
                // Reset to current month - just reload for now
                window.location.reload();
              }}
              className="bg-white hover:bg-amber-50 px-6 py-3 border border-amber-300 rounded-lg font-medium text-amber-700 transition-colors"
            >
              Try Current Month
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show no data state when no date range is selected
  if (!selectedDateRange) {
    return (
      <div className="space-y-6">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-semibold text-blue-800 text-xl">
            Ready to View Sales Performance
          </h3>
          <p className="mx-auto mb-4 max-w-md text-blue-600">
            Select a date range above to analyze your property sales data
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

  const data = reportData.data!;

  // Debug: Log the data being received
  console.log("=== FRONTEND DATA DEBUG ===");
  console.log("Raw data:", data);
  console.log("Monthly data:", data.monthlyData);
  console.log("KPIs:", data.kpis);
  console.log("==========================");

  // Check if we have any monthly data
  const hasMonthlyData = data.monthlyData && data.monthlyData.length > 0;
  const hasSalesData = data.kpis.unitsSold > 0;

  // Prepare chart data - use real data without scaling
  const chartData = hasMonthlyData
    ? data.monthlyData.map((item) => ({
        month: item.month,
        unitsSold: item.unitsSold, // Use real values, no scaling
        revenue: item.revenue,
      }))
    : [];

  // Debug: Log the chart data
  console.log("=== CHART DATA DEBUG ===");
  console.log("Chart data:", chartData);
  console.log("Has monthly data:", hasMonthlyData);
  console.log("Has sales data:", hasSalesData);
  console.log("Monthly data length:", data.monthlyData?.length);
  console.log("==========================");

  // Export function
  const exportToExcel = () => {
    if (reportData?.success && reportData.data) {
      try {
        const kpis = reportData.data.kpis;
        const tableData = reportData.data.monthlyData || [];

        exportReportToExcel(
          "Property Sales Performance",
          kpis,
          tableData,
          selectedDateRange || undefined
        );
      } catch (error) {
        console.error("Error exporting to Excel:", error);
      }
    }
  };

  // Chart configuration
  const chartConfig = {
    unitsSold: {
      label: "Units Sold",
      color: "#3b82f6",
    },
    revenue: {
      label: "Revenue (KES)",
      color: "#10b981",
    },
  };

  // Show chart if we have data, even if it's just one month
  const shouldShowChart = hasMonthlyData && chartData.length > 0;

  return (
    <div className="space-y-6">
      {/* First Row: Feature Cards */}
      <div className="gap-4 grid md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={TrendingUp}
          title="Units Sold"
          value={data.kpis.unitsSold.toLocaleString()}
          desc="Total sold units"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Average Sale Price"
          value={money(data.kpis.averageSalePrice)}
          desc="Average price per unit"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Total Revenue"
          value={money(data.kpis.totalRevenue)}
          desc="Sum of confirmed sales"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Avg Time to Close"
          value={formatTime(data.kpis.averageTimeToClose)}
          desc="Days from owner to contract"
        />
      </div>

      {/* Second Row: Combined Chart */}
      <div className="w-full">
        <div className="relative px-4 pt-8 border rounded-2xl w-full">
          {/* Stat summary */}
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="font-medium text-gray-500 text-xs">
                Sales Performance
              </div>
              <div className="font-bold text-gray-900 text-4xl">
                {data.kpis.unitsSold.toLocaleString()} Units
              </div>
              <div className="text-gray-500 text-sm">
                Units sold and revenue by month
              </div>
            </div>
            <Button onClick={exportToExcel} className="gap-2">
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
          </div>

          {/* Chart - only show if we have data */}
          {shouldShowChart ? (
            <>
              {chartData.length === 1 && (
                <div className="mb-4 text-center">
                  <div className="inline-flex items-center bg-blue-100 px-3 py-1 rounded-full text-blue-800 text-sm">
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
                    Single month data - chart shows data point for{" "}
                    {chartData[0].month}
                  </div>
                </div>
              )}
              <ChartLineMultiple
                chartData={chartData}
                chartConfig={chartConfig}
                title="Sales Performance"
                description={`${selectedDateRange.from} - ${selectedDateRange.to}`}
              />
            </>
          ) : (
            <div className="py-16 text-center">
              <div className="text-gray-500 text-lg">
                No chart data available for the selected period
              </div>
              <div className="mt-2 text-gray-400 text-sm">
                Select a different date range or check if sales data exists
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
