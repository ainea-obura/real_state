import { Activity, AlertTriangle, BarChart3, CheckCircle, CreditCard } from 'lucide-react';

import { fetchFinanceSummary } from '@/actions/dahsboard';
import { Card, CardContent } from '@/components/ui/card';
import { ChartLineMultiple } from '@/components/ui/chart-line-multiple';
import { useQuery } from '@tanstack/react-query';

import Header from '../../clients/tabs/components/Header';

const FinanceSummary = () => {
  const {
    data: financeData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["finance-summary"],
    queryFn: fetchFinanceSummary,
  });

  // Show loading state
  if (isLoading) {
    return (
      <section className="space-y-6 mt-10">
        <Header
          title="Finance Overview"
          description="Key financial metrics and trends"
        />
        <div className="gap-6 grid grid-cols-12">
          <div className="relative col-span-9 px-4 pt-8 border rounded-2xl w-full">
            <div className="flex justify-between items-center mb-2">
              <div>
                <div className="bg-gray-200 rounded w-32 h-4 animate-pulse" />
                <div className="bg-gray-200 mt-2 rounded w-40 h-8 animate-pulse" />
                <div className="bg-gray-200 mt-1 rounded w-24 h-3 animate-pulse" />
              </div>
            </div>
            <div className="bg-gray-100 rounded h-64 animate-pulse" />
          </div>
          <div className="flex flex-col gap-4 col-span-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card
                key={idx}
                className="relative bg-gray-100 shadow-none border-none overflow-hidden"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-200 p-2.5 rounded-md animate-pulse">
                      <div className="bg-gray-300 rounded w-5 h-5" />
                    </div>
                    <div className="flex flex-col justify-between items-start">
                      <div className="bg-gray-200 rounded w-20 h-4 animate-pulse" />
                      <div className="bg-gray-200 mt-2 rounded w-16 h-6 animate-pulse" />
                      <div className="bg-gray-200 mt-1 rounded w-24 h-3 animate-pulse" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (error) {
    return (
      <section className="space-y-6 mt-10">
        <Header
          title="Finance Overview"
          description="Key financial metrics and trends"
        />
        <div className="gap-6 grid grid-cols-12">
          <Card className="col-span-full bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <h3 className="font-medium">Error loading finance data</h3>
                  <p className="text-red-600 text-sm">
                    Please try refreshing the page
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  // Show data when available
  if (!financeData?.data) {
    return (
      <section className="space-y-6 mt-10">
        <Header
          title="Finance Overview"
          description="Key financial metrics and trends"
        />
        <div className="gap-6 grid grid-cols-12">
          <Card className="col-span-full bg-gray-50 border-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-gray-700">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <h3 className="font-medium">No finance data available</h3>
                  <p className="text-gray-600 text-sm">
                    Finance summary could not be loaded
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  const { summary, chartData } = financeData.data;
  const orgAccountBalance = financeData.org_account_balance;

  return (
    <section className="space-y-6 mt-10">
      <Header
        title="Finance Overview"
        description="Key financial metrics and trends"
      />
      <div className="gap-6 grid grid-cols-12">
        {/* Premium Line Chart Section */}
        <div className="relative col-span-9 px-4 pt-8 border rounded-2xl w-full">
          {/* Stat summary */}
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="font-medium text-gray-500 text-xs">
                Wallet Balance
              </div>
              <div className="font-bold text-gray-900 text-4xl">
                {orgAccountBalance}
              </div>
            </div>
          </div>
          {/* Chart */}
          <ChartLineMultiple
            chartData={chartData}
            chartConfig={{
              expenses: { label: "Expenses", color: "#f59e42" },
              payouts: { label: "Payouts", color: "#6366f1" },
            }}
            title="Expenses & Payouts"
            description={`January - December ${new Date().getFullYear()}`}
          />
        </div>
        {/* Summary Cards */}
        <div className="flex flex-col gap-4 col-span-3">
          {/* Total Received */}
          <Card className="relative bg-emerald-100 hover:bg-emerald-200 shadow-none border-none overflow-hidden transition-all duration-200 ease-in-out">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-200 p-2.5 rounded-md">
                  <CheckCircle className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="flex flex-col justify-between items-start">
                  <h3 className="font-medium text-sm">Total Received</h3>
                  <span className="font-semibold text-emerald-700 text-2xl tracking-tight">
                    {summary.totalReceived}
                  </span>
                  <p className="text-gray-500 text-xs">
                    All payments collected
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Total Expenses */}
          <Card className="relative bg-orange-100 hover:bg-orange-200 shadow-none border-none overflow-hidden transition-all duration-200 ease-in-out">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-200 p-2.5 rounded-md">
                  <Activity className="w-5 h-5 text-orange-700" />
                </div>
                <div className="flex flex-col justify-between items-start">
                  <h3 className="font-medium text-sm">Total Expenses</h3>
                  <span className="font-semibold text-orange-700 text-2xl tracking-tight">
                    {summary.totalExpenses}
                  </span>
                  <p className="text-gray-500 text-xs">All expenses paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Total Payouts */}
          <Card className="relative bg-indigo-100 hover:bg-indigo-200 shadow-none border-none overflow-hidden transition-all duration-200 ease-in-out">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-200 p-2.5 rounded-md">
                  <CreditCard className="w-5 h-5 text-indigo-700" />
                </div>
                <div className="flex flex-col justify-between items-start">
                  <h3 className="font-medium text-sm">Total Payouts</h3>
                  <span className="font-semibold text-indigo-700 text-2xl tracking-tight">
                    {summary.totalPayouts}
                  </span>
                  <p className="text-gray-500 text-xs">
                    Paid to property owners
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Net Income */}
          <Card className="relative bg-purple-100 hover:bg-purple-200 shadow-none border-none overflow-hidden transition-all duration-200 ease-in-out">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-purple-200 p-2.5 rounded-md">
                  <BarChart3 className="w-5 h-5 text-purple-700" />
                </div>
                <div className="flex flex-col justify-between items-start">
                  <h3 className="font-medium text-sm">Net Income</h3>
                  <span className="font-semibold text-purple-700 text-2xl tracking-tight">
                    {summary.netIncome}
                  </span>
                  <p className="text-gray-500 text-xs">
                    Income after expenses & payouts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FinanceSummary;
