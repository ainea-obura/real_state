import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Percent } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCommissions, fetchDownPaymentTracking, updateCommissionStatus, type CommissionData } from '@/actions/sales/commission';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface CommissionDashboardProps {
  dateRange?: { from: Date; to?: Date };
}

const CommissionDashboard = ({ dateRange }: CommissionDashboardProps) => {
  const queryClient = useQueryClient();

  const { data: commissionsData, isLoading: commissionsLoading, error: commissionsError } = useQuery({
    queryKey: ['commissions', dateRange],
    queryFn: () => fetchCommissions({
      date_from: dateRange?.from?.toISOString().split('T')[0],
      date_to: dateRange?.to?.toISOString().split('T')[0],
    }),
    enabled: true,
  });

  const { data: downPaymentData, isLoading: downPaymentLoading, error: downPaymentError } = useQuery({
    queryKey: ['down-payment-tracking'],
    queryFn: fetchDownPaymentTracking,
    enabled: true,
  });

  const updateCommissionMutation = useMutation({
    mutationFn: ({ commissionId, status, paidAmount, notes }: {
      commissionId: string;
      status: string;
      paidAmount?: number;
      notes?: string;
    }) => updateCommissionStatus(commissionId, status, paidAmount, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success('Commission status updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update commission: ${error.message}`);
    },
  });

  const handleUpdateCommission = (commissionId: string, status: string, paidAmount?: number) => {
    updateCommissionMutation.mutate({
      commissionId,
      status,
      paidAmount,
      notes: `Updated to ${status} status`,
    });
  };

  if (commissionsLoading || downPaymentLoading) {
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

  if (commissionsError || downPaymentError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            {commissionsError?.message || downPaymentError?.message || 'Failed to load commission data'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const commissions = commissionsData?.data?.commissions || [];
  const commissionSummary = commissionsData?.data?.summary;
  const downPayments = downPaymentData?.data?.down_payments || [];
  const downPaymentSummary = downPaymentData?.data?.summary;

  return (
    <div className="space-y-6">
      {/* Commission Summary Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Commission Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Commissions</CardTitle>
              <div className="text-2xl font-bold text-gray-900">{commissionSummary?.total_commissions || 0}</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">All commission records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Amount</CardTitle>
              <div className="text-2xl font-bold text-orange-600">
                KES {(commissionSummary?.total_pending_amount || 0).toLocaleString()}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Paid Amount</CardTitle>
              <div className="text-2xl font-bold text-green-600">
                KES {(commissionSummary?.total_paid_amount || 0).toLocaleString()}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Successfully paid</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Commission Rate</CardTitle>
              <div className="text-2xl font-bold text-blue-600">3%</div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">After contract signing</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Down Payment Tracking */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Percent className="h-5 w-5 text-blue-600" />
          Down Payment Tracking (20% Collection)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Expected (20%)</CardTitle>
              <div className="text-xl font-bold text-blue-600">
                KES {(downPaymentSummary?.total_expected_down_payments || 0).toLocaleString()}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">20% of total sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Collected</CardTitle>
              <div className="text-xl font-bold text-green-600">
                KES {(downPaymentSummary?.total_collected_down_payments || 0).toLocaleString()}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Actually collected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Collection Rate</CardTitle>
              <div className="text-xl font-bold text-purple-600">
                {(downPaymentSummary?.collection_rate || 0).toFixed(1)}%
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">Collection efficiency</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Commission List */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-purple-600" />
          Commission Details
        </h3>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {commissions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No commissions found</h3>
                  <p className="mt-1 text-sm text-gray-500">No commission records available for the selected period.</p>
                </div>
              ) : (
                commissions.map((commission) => (
                  <div key={commission.commission_id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">{commission.agent_name}</h4>
                          <Badge 
                            variant={
                              commission.status === 'paid' ? 'default' :
                              commission.status === 'pending' ? 'secondary' :
                              commission.status === 'approved' ? 'outline' : 'destructive'
                            }
                          >
                            {commission.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Sale Value:</span>
                            <p className="font-medium">KES {commission.total_sale_value.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Commission:</span>
                            <p className="font-medium">KES {commission.commission_amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Rate:</span>
                            <p className="font-medium">{commission.commission_rate}%</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Sale Date:</span>
                            <p className="font-medium">{new Date(commission.sale_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {commission.properties.length > 0 && (
                          <div className="mt-2">
                            <span className="text-gray-500 text-sm">Properties:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {commission.properties.map((prop, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {prop.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {commission.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateCommission(commission.commission_id, 'approved')}
                              disabled={updateCommissionMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateCommission(commission.commission_id, 'paid', commission.commission_amount)}
                              disabled={updateCommissionMutation.isPending}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          </>
                        )}
                        {commission.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleUpdateCommission(commission.commission_id, 'paid', commission.commission_amount)}
                            disabled={updateCommissionMutation.isPending}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Pay Now
                          </Button>
                        )}
                        {commission.status === 'paid' && commission.paid_date && (
                          <div className="text-sm text-gray-500">
                            Paid: {new Date(commission.paid_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommissionDashboard;
