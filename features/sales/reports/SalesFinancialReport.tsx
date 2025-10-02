import { DollarSign, TrendingUp, BarChart3, PieChart, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchSalesFinancialReport, type SalesFinancialData } from '@/actions/sales/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SalesFinancialReportProps {
  dateRange?: { from: Date; to?: Date };
}

const SalesFinancialReport = ({ dateRange }: SalesFinancialReportProps) => {
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['sales-financial-report', dateRange],
    queryFn: () => fetchSalesFinancialReport(dateRange),
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
            {error?.message || 'Failed to load sales financial report'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { revenue, monthly_trends, top_performing_units, summary } = reportData;

  return (
    <div className="space-y-6">
      {/* Revenue Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Revenue Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Sales Value</CardTitle>
              <div className="text-xl font-bold text-green-600">{revenue.total_sales_value}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Gross revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Down Payments</CardTitle>
              <div className="text-xl font-bold text-blue-600">{revenue.down_payments_received}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Collected payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
              <div className="text-xl font-bold text-orange-600">{revenue.outstanding_revenue}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Pending collection</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Collection Rate</CardTitle>
              <div className="text-xl font-bold text-purple-600">{revenue.collection_rate}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Payment efficiency</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Statistics */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Summary Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
              <div className="text-2xl font-bold text-gray-900">{summary.total_transactions}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Sales completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Average Sale Value</CardTitle>
              <div className="text-2xl font-bold text-green-600">{summary.average_sale_value}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Per transaction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Units Sold</CardTitle>
              <div className="text-2xl font-bold text-blue-600">{summary.total_units_sold}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Total properties</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Performing Units */}
      {top_performing_units.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            Top Performing Units
          </h3>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {top_performing_units.map((unit, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-gray-900">
                          {unit.property_node__name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {unit.property_node__unit_detail__unit_type || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {unit.total_value ? `KES ${unit.total_value.toLocaleString()}` : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {unit.sales_count} sale{unit.sales_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Trends */}
      {monthly_trends.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-purple-600" />
            Monthly Sales Trends
          </h3>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {monthly_trends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(trend.month).toLocaleDateString('en-US', { 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {trend.sales_count} transaction{trend.sales_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {trend.total_value ? `KES ${trend.total_value.toLocaleString()}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Information */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BarChart3 className="h-4 w-4" />
            <span>
              Financial report period: {reportData.period.from} to {reportData.period.to}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesFinancialReport;




