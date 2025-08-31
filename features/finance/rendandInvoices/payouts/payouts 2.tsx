"use client";

import { ArrowUpCircle, Loader2, TrendingUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { approvePayout, fetchPayouts } from '@/actions/finance/payouts';
import { DataTable } from '@/components/datatable/data-table';
import { DateRangePicker } from '@/components/date-range-picker';
import FeatureCard from '@/features/property/tabs/components/featureCard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createColumns } from './columns';
import ApprovePayoutModal from './components/ApprovePayoutModal';
import ViewPayoutModal from './components/ViewPayoutModal';
import { Payout } from './schema';

const Payouts = () => {
  // Date range state (not used for API, but kept for UI)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(1)), // first day of current month
    to: new Date(), // today
  });

  // Details modal state
  const queryClient = useQueryClient();
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [approveModal, setApproveModal] = useState<{
    open: boolean;
    payout: Payout | null;
  }>({ open: false, payout: null });

  // Approve payout mutation
  const approveMutation = useMutation({
    mutationFn: async ({
      payoutId,
      paymentMethod,
      account,
      amount,
      reference,
      tab,
      paybill_number,
      paybill_option,
    }: {
      payoutId: string;
      paymentMethod: string;
      account: string;
      amount: number;
      reference: string;
      tab: string;
      paybill_number?: string;
      paybill_option?: string;
    }) => {
      return await approvePayout({
        payout_id: payoutId,
        payment_method: paymentMethod,
        account,
        amount,
        reference,
        tab,
        paybill_number,
        paybill_option,
      });
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success("Payout approved successfully");
      setApproveModal({ open: false, payout: null });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Fetch payouts using React Query
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "payouts",
      dateRange.from.toISOString().split("T")[0],
      dateRange.to.toISOString().split("T")[0],
    ],
    queryFn: () =>
      fetchPayouts({
        date_from: dateRange.from.toISOString().split("T")[0],
        date_to: dateRange.to.toISOString().split("T")[0],
      }),
  });

  // Table columns (must be after data is defined)
  const columns = useMemo(
    () =>
      createColumns({
        onView: setSelectedPayout,
        onApprove: (id) => {
          const payout = data?.data?.results?.find((p) => p.id === id);
          console.log("PAYOUT", payout);
          if (payout) {
            setApproveModal({ open: true, payout });
          }
        },
      }),
    [data]
  );

  if (isLoading)
    return (
      <div className="flex flex-col justify-center items-center py-12 min-h-[300px]">
        <Loader2 className="mb-4 w-10 h-10 text-green-600 animate-spin" />
        <div className="font-medium text-gray-700 text-lg">
          Loading payouts...
        </div>
      </div>
    );
  if (error) return <div>Error loading payouts</div>;

  // Summary statistics
  const totalPayouts = data?.summary.total_payouts ?? 0;
  const pendingPayouts = data?.summary.pending ?? 0;
  const totalAmount = data?.summary.total_amount ?? 0;
  const completedAmount = data?.summary.completed_amount ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-2xl">Payouts</h1>
          <p className="text-gray-600">
            Track and manage system-generated payouts to property owners
          </p>
        </div>

        <div>
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={({ range }) => {
              setDateRange({ from: range.from, to: range.to ?? range.from });
            }}
            align="end"
            showCompare={false}
          />
        </div>
      </div>

      {/* Date Range Picker */}

      {/* Summary Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={ArrowUpCircle}
          title="Total Payouts"
          value={totalPayouts}
        />
        <FeatureCard icon={TrendingUp} title="Pending" value={pendingPayouts} />
        <FeatureCard
          icon={ArrowUpCircle}
          title="Total Amount"
          value={`${totalAmount.toLocaleString()}`}
        />
        <FeatureCard
          icon={Users}
          title="Completed Amount"
          value={`${completedAmount.toLocaleString()}`}
        />
      </div>

      {/* Data Table */}
      <div>
        <DataTable
          columns={columns}
          data={{
            data: {
              results: data?.data?.results ?? [],
              count: data?.data?.count ?? 0,
            },
          }}
          isLoading={isLoading}
          isError={false}
          options={[]}
          tableKey="payouts"
          searchableColumnIds={["payout_number", "owner_name", "owner"]}
          searchableColumnsSetters={[]}
        />
        {/* Approve Modal */}
        {approveModal.open && approveModal.payout && (
          <ApprovePayoutModal
            open={approveModal.open}
            onClose={() => setApproveModal({ open: false, payout: null })}
            onApprove={(data) =>
              approveMutation.mutate({
                payoutId: approveModal.payout!.id,
                paymentMethod: data.payment_method,
                account: data.account,
                amount: data.amount,
                reference: data.reference,
                tab: data.tab,
                paybill_number: data.paybill_number,
                paybill_option: data.paybill_option,
              })
            }
            payout={{
              payout_number: approveModal.payout.payout_number,
              owner_name: approveModal.payout.owner_name,
              net_amount: approveModal.payout.net_amount,
              owner_phone: approveModal.payout.owner_phone,
              amount: approveModal.payout.amount,
            }}
            loading={approveMutation.isPending}
          />
        )}
        {/* Details Modal */}
        {selectedPayout && (
          <ViewPayoutModal
            open={!!selectedPayout}
            onClose={() => setSelectedPayout(null)}
            payout={selectedPayout}
          />
        )}
      </div>
    </div>
  );
};

export default Payouts;
