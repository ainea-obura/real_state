import { Building2, DollarSign, TrendingUp, Users, Calendar, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchSalesSummaryReport, type SalesSummaryData } from '@/actions/sales/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SalesSummaryReportProps {
  dateRange?: { from: Date; to?: Date };
}

const SalesSummaryReport = ({ dateRange }: SalesSummaryReportProps) => {
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['sales-summary-report', dateRange],
    queryFn: () => fetchSalesSummaryReport(dateRange),
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            {error?.message || 'Failed to load sales summary report'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { apartment_status, financial_summary, recent_activity } = reportData;

  return (
    <div className="space-y-6">
      {/* Apartment Status Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Apartment Status Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Units</CardTitle>
              <div className="text-2xl font-bold text-gray-900">{apartment_status.total_units}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">All apartments in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Available</CardTitle>
              <div className="text-2xl font-bold text-green-600">{apartment_status.available}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Ready for sale</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Sold</CardTitle>
              <div className="text-2xl font-bold text-blue-600">{apartment_status.sold}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Successfully sold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Booked</CardTitle>
              <div className="text-2xl font-bold text-orange-600">{apartment_status.booked + apartment_status.deposit_paid}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Reserved or deposit paid</p>
            </CardContent>
          </Card>
        </div>

        {/* Occupancy Rate */}
        <div className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Occupancy Rate</span>
                </div>
                <Badge variant="secondary" className="text-lg font-bold">
                  {apartment_status.occupancy_rate}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Financial Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Financial Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Sales Value</CardTitle>
              <div className="text-xl font-bold text-green-600">{financial_summary.total_sales_value}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">All completed sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Down Payments</CardTitle>
              <div className="text-xl font-bold text-blue-600">{financial_summary.total_down_payments}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Received payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
              <div className="text-xl font-bold text-orange-600">{financial_summary.outstanding_amount}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Pending collection</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Recent Activity
        </h3>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{recent_activity.sales_this_period}</div>
                <p className="text-sm text-gray-600">Sales This Period</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{recent_activity.reservations_this_period}</div>
                <p className="text-sm text-gray-600">New Reservations</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{recent_activity.units_sold_this_period}</div>
                <p className="text-sm text-gray-600">Units Sold</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BarChart3 className="h-4 w-4" />
            <span>
              Report period: {reportData.period.from} to {reportData.period.to}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesSummaryReport;
