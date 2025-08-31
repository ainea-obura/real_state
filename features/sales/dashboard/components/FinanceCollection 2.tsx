import { getFinancialCollections } from '@/actions/sales/reports/getFinancialCollections';
import { ChartLineMultiple } from '@/components/ui/chart-line-multiple';
import { useQuery } from '@tanstack/react-query';

interface FinanceCollectionProps {
  selectedDateRange: {
    from: string;
    to: string;
  };
}

const FinanceCollection = ({ selectedDateRange }: FinanceCollectionProps) => {
  // Helper function to format money
  const money = (x: number | undefined) => {
    if (!x) return "—";
    return `KES ${x.toLocaleString()}`;
  };

  const {
    data: reportData,
    isLoading,
    error,
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

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="relative px-4 pt-8 border rounded-2xl w-full">
          <div className="flex justify-center items-center h-32">
            <div className="text-gray-500">Loading finance data...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !reportData?.success) {
    return (
      <div className="w-full">
        <div className="relative px-4 pt-8 border rounded-2xl w-full">
          <div className="flex justify-center items-center h-32">
            <div className="text-red-500">
              {reportData?.message || "Failed to load finance data"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get finance data safely
  const financeData = reportData.data!;
  const monthlyData = financeData.monthlyData || [];

  return (
    <div className="w-full">
      {/* Full Width Chart Section */}
      <div className="relative px-4 pt-8 border rounded-2xl w-full">
        {/* Stat summary */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="font-medium text-gray-500 text-xs">
              Finance Collection
            </div>
            <div className="font-bold text-gray-900 text-4xl">
              {money(financeData.kpis.collectedPeriod)}
            </div>
            <div className="text-gray-500 text-sm">
              Collected vs expected by month
            </div>
          </div>
        </div>
        {/* Chart */}
        <ChartLineMultiple
          chartData={monthlyData}
          chartConfig={{
            expected: { label: "Expected", color: "#f59e42" },
            collected: { label: "Collected", color: "#6366f1" },
          }}
          title="Expected vs Collected"
          description={`${selectedDateRange?.from} - ${selectedDateRange?.to}`}
        />
      </div>
    </div>
  );
};

export default FinanceCollection;
