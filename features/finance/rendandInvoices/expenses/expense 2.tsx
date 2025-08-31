import { useState, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { DataTable } from "@/components/datatable/data-table";
import FeatureCard from "@/features/property/tabs/components/featureCard";
import { createExpenseColumns } from "./components/columns";
import { AddExpenseModal } from "./components/AddExpenseModal";
import { Plus, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchExpenseStats,
  fetchExpenseTable,
  deleteExpense,
  payExpense,
  approveExpense,
  rejectExpense,
} from "@/actions/finance/expense";
import { Expense } from "./schema/expenseSchema";
import { useAtom } from "jotai";
import { pageIndexAtom, pageSizeAtom } from "@/store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PermissionGate } from "@/components/PermissionGate";
import PayExpenseModal from "./components/PayExpenseModal";
import PayCommissionModal from "./components/PayCommissionModal";

const Expenses = () => {
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [expenseToPay, setExpenseToPay] = useState<Expense | null>(null);
  const [expenseToApprove, setExpenseToApprove] = useState<Expense | null>(null);
  const [expenseToReject, setExpenseToReject] = useState<Expense | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  // Remove local page state
  // const [page, setPage] = useState(1);
  // const pageSize = 10
  const [pageIndex, setPageIndex] = useAtom(pageIndexAtom);
  const [pageSize, setPageSize] = useAtom(pageSizeAtom);
  // Add delete loading state
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch stats
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    error: statsError,
  } = useQuery<Awaited<ReturnType<typeof fetchExpenseStats>>, Error>({
    queryKey: ["expense-stats"],
    queryFn: fetchExpenseStats,
  });

  // Fetch expenses
  const {
    data: expenseTable,
    isLoading: isTableLoading,
    isError: isTableError,
    error: tableError,
  } = useQuery<Awaited<ReturnType<typeof fetchExpenseTable>>, Error>({
    queryKey: ["expense-table", pageIndex, pageSize],
    queryFn: () =>
      fetchExpenseTable({ page: pageIndex + 1, page_size: pageSize }),
  });

  // Compute derived stats from fetched expenses
  const derivedStats = useMemo(() => {
    const expenses = expenseTable?.results ?? [];
    if (!expenses.length)
      return {
        topVendor: "-",
        topCategory: "-",
        mostRecent: null,
        expenseCount: 0,
      };
    // Top vendor
    const vendorTotals: Record<string, number> = {};
    expenses.forEach((e: Expense) => {
      if (e.vendor?.id) {
        vendorTotals[e.vendor.id] =
          (vendorTotals[e.vendor.id] || 0) + e.total_amount;
      }
    });
    const topVendorId = Object.entries(vendorTotals).sort(
      (a: [string, number], b: [string, number]) => b[1] - a[1]
    )[0]?.[0];
    const topVendor =
      expenses.find((e: Expense) => e.vendor?.id === topVendorId)?.vendor
        ?.name || "-";
    // Top category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e: Expense) => {
      if (e.service?.id) {
        categoryTotals[e.service.id] =
          (categoryTotals[e.service.id] || 0) + e.total_amount;
      }
    });
    const topCategoryId = Object.entries(categoryTotals).sort(
      (a: [string, number], b: [string, number]) => b[1] - a[1]
    )[0]?.[0];
    const topCategory =
      expenses.find((e: Expense) => e.service?.id === topCategoryId)?.service
        ?.name || "-";
    // Most recent expense
    const mostRecent = expenses
      .slice()
      .sort((a: Expense, b: Expense) =>
        b.invoice_date.localeCompare(a.invoice_date)
      )[0];
    return {
      topVendor,
      topCategory,
      mostRecent,
      expenseCount: expenses.length,
    };
  }, [expenseTable]);

  const approveExpenseMutation = useMutation({
    mutationFn: approveExpense,
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success("Expense approved successfully");
      setExpenseToApprove(null);
      queryClient.invalidateQueries({ queryKey: ["expense-table"] });
      queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to approve expense");
    },
    onSettled: () => {
      setIsApproving(false);
    },
  });

  const rejectExpenseMutation = useMutation({
    mutationFn: ({ expenseId, reason }: { expenseId: string; reason?: string }) => 
      rejectExpense(expenseId, reason),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success("Expense rejected successfully");
      setExpenseToReject(null);
      queryClient.invalidateQueries({ queryKey: ["expense-table"] });
      queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reject expense");
    },
    onSettled: () => {
      setIsRejecting(false);
    },
  });

  const payExpenseMutation = useMutation({
    mutationFn: async ({
      expenseId,
      paymentMethod,
      account,
      tab,
      amount,
      reference,
      paybill_number,
      paybill_option,
    }: {
      expenseId: string | number;
      paymentMethod: string;
      account: string;
      tab: string;
      amount: number;
      reference: string;
      paybill_number?: string;
      paybill_option?: string;
    }) => {
      return payExpense(
        expenseId,
        paymentMethod,
        account,
        tab,
        amount,
        reference,
        paybill_number,
        paybill_option
      );
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success("Expense marked as paid");
      setExpenseToPay(null); // Only close modal on success
      queryClient.invalidateQueries({ queryKey: ["expense-table"] });
      queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to mark expense as paid");
    },
    onSettled: () => {
      setIsPaying(false);
    },
  });

  // DataTable columns
  const columns = createExpenseColumns({
    onEdit: (expense) => setEditExpense(expense),
    onDelete: (expense) => setExpenseToDelete(expense),
    onApprove: (expense) => setExpenseToApprove(expense),
    onReject: (expense) => setExpenseToReject(expense),
    onPay: (expense) => setExpenseToPay(expense),
  });

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      await deleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["expense-table"] });
      await queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete expense");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billings</h1>
          <p className="text-gray-600">
            Track and manage all property-related billings. 
          </p>
        </div>
        <div className="flex gap-3">
          <PermissionGate codename="add_expenses" showFallback={false}>
            <Button
              onClick={() => setModalOpen(true)}
              className="flex gap-2 items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Add Billing
            </Button>
          </PermissionGate>
          <PermissionGate codename="add_expenses" showFallback={false}>
            <Button
              onClick={() => setCommissionModalOpen(true)}
              className="flex gap-2 items-center px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Plus className="w-4 h-4" /> Pay Commissions
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isStatsLoading ? (
          <div className="col-span-4 text-center text-gray-500">
            Loading stats...
          </div>
        ) : isStatsError ? (
          <div className="col-span-4 text-center text-red-500">
            {String(statsError)}
          </div>
        ) : stats ? (
          <>
            <FeatureCard title="Total Billings" value={stats.totalExpenses} />
            <FeatureCard title="Total Paid" value={stats.totalPaid} />
            <FeatureCard
              icon={AlertCircle}
              title="Outstanding"
              value={stats.outStanding}
            />
            <FeatureCard
              icon={AlertTriangle}
              title="Overdue"
              value={stats.overdueExpenses}
            />
          </>
        ) : null}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={{
          error: isTableError,
          data: {
            count: expenseTable?.count || 0,
            results: expenseTable?.results || [],
          },
        }}
        isLoading={isTableLoading}
        isError={isTableError}
        options={[]}
        tableKey="expenses"
        searchableColumnIds={["expense_number", "description", "status"]}
        searchableColumnsSetters={[() => {}]}
      />

      {/* Add/Edit Modal */}
      <PermissionGate codename="add_expenses" showFallback={false}>
        <AddExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} />
        <AddExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </PermissionGate>

      {/* Delete Confirmation Modal */}
      <PermissionGate codename="delete_expenses" showFallback={false}>
        <AlertDialog
          open={!!expenseToDelete}
          onOpenChange={(open) => !open && setExpenseToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this expense? This action cannot
                be undone.
                <br />
                <span className="font-medium text-gray-900">
                  Expense #{expenseToDelete?.expense_number}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteExpense}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PermissionGate>

      {/* Pay Confirmation Modal */}
      <PermissionGate codename="pay_expenses" showFallback={false}>
        {expenseToPay && (
          <PayExpenseModal
            open={!!expenseToPay}
            expense={expenseToPay}
            onClose={() => setExpenseToPay(null)}
            onPay={(data) => {
              setIsPaying(true);
              payExpenseMutation.mutate({
                expenseId: expenseToPay.id,
                paymentMethod: data.payment_method,
                account: data.account,
                tab: data.tab,
                amount: data.amount,
                reference: data.reference,
                paybill_number: data.paybill_number,
                paybill_option: data.paybill_option,
              });
            }}
            isPaying={isPaying}
          />
        )}
      </PermissionGate>

      {/* Approve Confirmation Modal */}
      <PermissionGate codename="approve_expenses" showFallback={false}>
        <AlertDialog
          open={!!expenseToApprove}
          onOpenChange={(open) => !open && setExpenseToApprove(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Expense</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this expense? This will change the status from "Waiting for Approval" to "Pending" and allow payment.
                <br />
                <span className="font-medium text-gray-900">
                  Expense #{expenseToApprove?.expense_number}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isApproving}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (expenseToApprove) {
                    setIsApproving(true);
                    approveExpenseMutation.mutate(expenseToApprove.id);
                  }
                }}
                disabled={isApproving}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isApproving ? "Approving..." : "Approve"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PermissionGate>

      {/* Reject Confirmation Modal */}
      <PermissionGate codename="approve_expenses" showFallback={false}>
        <AlertDialog
          open={!!expenseToReject}
          onOpenChange={(open) => !open && setExpenseToReject(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Expense</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject this expense? This will change the status from "Waiting for Approval" to "Rejected".
                <br />
                <span className="font-medium text-gray-900">
                  Expense #{expenseToReject?.expense_number}
                </span>
                <br />
                <span className="block mt-2 text-sm text-gray-600">
                  You can optionally provide a reason for rejection:
                </span>
                <textarea
                  className="p-2 mt-2 w-full text-sm rounded-md border border-gray-300"
                  placeholder="Reason for rejection (optional)..."
                  rows={3}
                  id="rejection-reason"
                />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRejecting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (expenseToReject) {
                    setIsRejecting(true);
                    const reason = (document.getElementById("rejection-reason") as HTMLTextAreaElement)?.value || "";
                    rejectExpenseMutation.mutate({ 
                      expenseId: expenseToReject.id, 
                      reason: reason.trim() || undefined 
                    });
                  }
                }}
                disabled={isRejecting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isRejecting ? "Rejecting..." : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PermissionGate>

      {/* Pay Commission Modal */}
      <PayCommissionModal
        isOpen={commissionModalOpen}
        onClose={() => setCommissionModalOpen(false)}
        onSuccess={() => {
          setCommissionModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["expense-table"] });
          queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
        }}
      />
    </div>
  );
};

export default Expenses;
