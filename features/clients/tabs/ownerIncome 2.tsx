"use client";

import { AlertCircle, BarChart3, Calculator, Coins, FileText, Receipt } from 'lucide-react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { getOwnerIncomeDetail } from '@/actions/clients/ownerDashboardAction';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OwnerIncomeDetailResponse } from '@/features/clients/tabs/schema/ownerIncomeSchema';
import { useQuery } from '@tanstack/react-query';

const OwnerIncome = () => {
  const params = useParams();
  const ownerId = params.id as string;

  // Fetch real data using React Query
  const {
    data: apiResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["owner-income-detail", ownerId],
    queryFn: () => getOwnerIncomeDetail(ownerId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!ownerId && ownerId !== "undefined",
  });

  // Handle API error messages
  if (apiResponse?.error && apiResponse?.message) {
    toast.error(apiResponse.message);
  }

  // Extract data from API response
  const data: OwnerIncomeDetailResponse | undefined =
    apiResponse?.data?.results?.[0];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">
              Income Management
            </h1>
            <p className="text-muted-foreground">Loading income data...</p>
          </div>
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="border-primary border-b-2 rounded-full w-8 h-8 animate-spin"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data || !ownerId || ownerId === "undefined") {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">
              Income Management
            </h1>
            <p className="text-muted-foreground">Error loading income data</p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 w-12 h-12 text-red-500" />
          <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100 text-lg">
            Failed to Load Income Data
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {!ownerId || ownerId === "undefined"
              ? "Owner ID is missing. Please check the URL."
              : apiResponse?.message ||
                "Unable to fetch income information. Please try again later."}
          </p>
        </Card>
      </div>
    );
  }

  // UI rendering for new schema
  // Sort last_3_months_trend by month ascending (oldest first)
  const sortedTrend = data.last_3_months_trend
    ? [...data.last_3_months_trend].sort((a, b) =>
        a.month.localeCompare(b.month)
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Income Management
          </h1>
          <p className="text-muted-foreground">
            Rental income and management fee overview
          </p>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="gap-3 grid md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative bg-primary/5 hover:bg-primary/10 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <Coins className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-xs">Total Income</h3>
                    <span className="font-semibold text-lg tracking-tight">
                      {data.total_income}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-gray-500 text-xs">All-time rental income</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-green-50 hover:bg-green-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 p-2 rounded-md">
                    <Calculator className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-xs">Management Fees</h3>
                    <span className="font-semibold text-lg tracking-tight">
                      {data.management_fee}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-gray-500 text-xs">Total management fees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-blue-100 hover:bg-blue-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-200 p-2 rounded-md">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-xs">Monthly Average</h3>
                    <span className="font-semibold text-lg tracking-tight">
                      {data.monthly_average_income}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-gray-500 text-xs">Average monthly income</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative bg-orange-100 hover:bg-orange-100 shadow-none border-none overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-orange-200 p-2 rounded-md">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex flex-col justify-between items-start">
                    <h3 className="font-medium text-xs">Pending Payouts</h3>
                    <span className="font-semibold text-red-600 text-lg tracking-tight">
                      {data.outstanding_payments}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-gray-500 text-xs">Pending payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Transactions */}
      <Card className="relative bg-transparent hover:bg-gray-50/50 shadow-none border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              Income Transactions
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!data.income_transactions ||
          data.income_transactions.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100 text-lg">
                No Income Records Found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No rental income records available.
              </p>
            </div>
          ) : (
            <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
              {data.income_transactions.map((payment) => (
                <div
                  key={payment.payout_number}
                  className="bg-gray-50/80 hover:bg-gray-100/80 p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors duration-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Receipt className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {payment.property || "-"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Payout #: {payment.payout_number}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">Amount</span>
                      <span className="font-semibold text-sm">
                        {payment.amount}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">Date</span>
                      <span className="text-xs">
                        {payment.date ? payment.date.split("T")[0] : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-gray-200 border-t">
                    <Badge
                      className={
                        payment.status === "completed"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : payment.status === "pending"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                          : payment.status === "failed"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last 3 Months Income Trend */}
      <Card className="relative bg-transparent hover:bg-gray-50/50 shadow-none border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-200 ease-in-out">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="bg-purple-100 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            Last 3 Months Income Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
            {sortedTrend.map((monthData, index) => (
              <div
                key={index}
                className="bg-gray-50/80 hover:bg-gray-100/80 p-4 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-primary rounded-full w-2 h-2"></div>
                  <span className="font-medium text-sm">{monthData.month}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">Rental Income</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {monthData.income}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">
                      Management Fees
                    </span>
                    <span className="font-semibold text-green-600 text-sm">
                      {monthData.management_fee}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerIncome;
