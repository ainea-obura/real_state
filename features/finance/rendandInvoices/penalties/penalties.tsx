"use client";

import { AlertTriangle, Plus, Settings, TrendingUp } from "lucide-react";
import { useState } from "react";

import {
  fetchPenaltyList,
  fetchPenaltyStats,
  PenaltyListParams,
  PenaltyStatsParams,
} from "@/actions/finance/penalties";
import { DataTable } from "@/components/datatable/data-table";
import { DateRangePicker } from "@/components/date-range-picker";
import { Button } from "@/components/ui/button";
import FeatureCard from "@/features/property/tabs/components/featureCard";
import { useQuery } from "@tanstack/react-query";

import { createColumns, Penalty } from "./columns";
import AddPenaltyModal from "./components/AddPenaltyModal";
import AddToInvoiceModal from "./components/AddToInvoiceModal";
import DeletePenaltyModal from "./components/DeletePenaltyModal";
import EditPenaltyModal from "./components/EditPenaltyModal";
import PenaltySettingsModal from "./components/PenaltySettingsModal";
import ViewPenaltyModal from "./components/ViewPenaltyModal";
import WaivePenaltyModal from "./components/WaivePenaltyModal";
import { PermissionGate } from "@/components/PermissionGate";

// Interface for modal components (camelCase format)
interface ModalPenalty {
  id: string;
  penaltyNumber: string;
  tenant: {
    name: string;
    email: string;
    phone: string;
  };
  property: {
    unit: string;
    projectName: string;
  };
  penaltyType:
    | "late_payment"
    | "returned_payment"
    | "lease_violation"
    | "utility_overcharge"
    | "other";
  amount: number;
  amountType: "fixed" | "percentage";
  percentageOf?: number;
  dateApplied: string;
  dueDate: string;
  status: "pending" | "applied_to_invoice" | "waived" | "paid";
  linkedInvoice?: {
    id: string;
    invoiceNumber: string;
  };
  notes?: string;
  tenantNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  waivedAt?: string;
  waivedBy?: string;
  waivedReason?: string;
}

// Transform API penalty to modal format
const transformPenaltyForModal = (apiPenalty: Penalty): ModalPenalty => {
  return {
    id: apiPenalty.id,
    penaltyNumber: apiPenalty.penalty_number,
    tenant: apiPenalty.tenant,
    property: {
      unit: apiPenalty.property.unit,
      projectName: apiPenalty.property.project_name,
    },
    penaltyType: apiPenalty.penalty_type,
    amount: apiPenalty.amount,
    amountType: apiPenalty.amount_type,
    dateApplied: apiPenalty.date_applied,
    dueDate: apiPenalty.due_date,
    status: apiPenalty.status,
    linkedInvoice: apiPenalty.linked_invoice_info
      ? {
          id: apiPenalty.linked_invoice_info.id,
          invoiceNumber: apiPenalty.linked_invoice_info.invoice_number,
        }
      : undefined,
    notes: apiPenalty.notes,
    tenantNotes: apiPenalty.tenant_notes,
    createdBy: apiPenalty.created_by_info?.name || "Unknown",
    createdAt: apiPenalty.created_at,
    updatedAt: apiPenalty.updated_at,
    waivedAt: apiPenalty.waived_at,
    waivedBy: apiPenalty.waived_by_info?.name,
    waivedReason: apiPenalty.waived_reason,
  };
};

interface PenaltiesProps {
  statusOptions?: { label: string; value: string }[];
  typeOptions?: { label: string; value: string }[];
}

const Penalties = ({}: PenaltiesProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<ModalPenalty | null>(
    null
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWaiveModalOpen, setIsWaiveModalOpen] = useState(false);
  const [isAddToInvoiceModalOpen, setIsAddToInvoiceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Date range state
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date | undefined;
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    to: new Date(),
  });

  // Convert date range to API format
  const getDateParams = () => {
    const params: PenaltyListParams & PenaltyStatsParams = {};

    if (dateRange.from) {
      params.date_from = dateRange.from.toISOString().split("T")[0]; // YYYY-MM-DD
    }

    if (dateRange.to) {
      params.date_to = dateRange.to.toISOString().split("T")[0]; // YYYY-MM-DD
    }

    return params;
  };

  const dateParams = getDateParams();

  // Fetch penalty list data with React Query
  const {
    data: penaltyListData,
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ["penalties-list", dateParams],
    queryFn: async () => {
      const data = await fetchPenaltyList(dateParams);
      return data;
    },
  });

  

  // Fetch penalty stats with React Query
  const {
    data: penaltyStatsData,
    isLoading: isStatsLoading,
    isError: isStatsError,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["penalties-stats", dateParams],
    queryFn: async () => {
      const data = await fetchPenaltyStats(dateParams);
      return data;
    },
  });

  // Handle date range change
  const handleDateRangeChange = (values: {
    range: { from: Date; to: Date | undefined };
    rangeCompare?: { from: Date; to: Date | undefined };
  }) => {
    setDateRange(values.range);
    // Refetch data with new date range
    refetchList();
    refetchStats();
  };

  const handleAddPenalty = () => {
    setIsAddModalOpen(true);
  };

  const handleViewPenalty = (penalty: Penalty) => {
    setSelectedPenalty(transformPenaltyForModal(penalty));
    setIsViewModalOpen(true);
  };

  const handleEditPenalty = (penalty: Penalty) => {
    setSelectedPenalty(transformPenaltyForModal(penalty));
    setIsEditModalOpen(true);
  };

  const handleWaivePenalty = (penalty: Penalty) => {
    setSelectedPenalty(transformPenaltyForModal(penalty));
    setIsWaiveModalOpen(true);
  };

  const handleAddToInvoice = (penalty: Penalty) => {
    setSelectedPenalty(transformPenaltyForModal(penalty));
    setIsAddToInvoiceModalOpen(true);
  };

  const handleDeletePenalty = (penalty: Penalty) => {
    setSelectedPenalty(transformPenaltyForModal(penalty));
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (penaltyId: string, reason: string) => {
    try {
      // TODO: Implement actual API call to delete penalty
      

      // For now, just remove from local state
      // In a real implementation, you would make an API call here
      // await deletePenalty(penaltyId, reason);

      // Show success message or update UI
      
    } catch (error) {
      
      throw error; // Re-throw to let the modal handle the error
    }
  };

  // Get stats from API data or fallback to 0
  const stats = penaltyStatsData?.results?.[0];
  const totalPenalties = stats?.total_penalties ?? 0;
  const pendingPenalties = stats?.pending_penalties ?? 0;
  const totalAmount = stats?.total_amount ?? 0;
  const waivedAmount = stats?.waived_amount ?? 0;

  // Get penalty list data or empty array
  const penaltyData = penaltyListData?.results ?? [];
  const penaltyCount = penaltyListData?.count ?? 0;

  // Create columns with handlers
  const columns = createColumns({
    onView: handleViewPenalty,
    onEdit: handleEditPenalty,
    onWaive: handleWaivePenalty,
    onAddToInvoice: handleAddToInvoice,
    onDelete: handleDeletePenalty,
  });

  // Filter options for the DataTable
  const filterOptions = [
    {
      label: "Status",
      value: "status",
      options: [
        { label: "All Status", value: "" },
        { label: "Pending", value: "pending" },
        { label: "Applied to Invoice", value: "applied_to_invoice" },
        { label: "Waived", value: "waived" },
        { label: "Paid", value: "paid" },
      ],
    },
    {
      label: "Penalty Type",
      value: "penalty_type",
      options: [
        { label: "All Types", value: "" },
        { label: "Late Payment", value: "late_payment" },
        { label: "Returned Payment", value: "returned_payment" },
        { label: "Lease Violation", value: "lease_violation" },
        { label: "Utility Overcharge", value: "utility_overcharge" },
        { label: "Other", value: "other" },
      ],
    },
  ];

  // Show loading state
  if (isListLoading || isStatsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-b-2 animate-spin border-primary"></div>
      </div>
    );
  }

  // Show error state
  if (isListError || isStatsError) {
    return (
      <div className="flex justify-center items-center h-64 text-red-600">
        {listError?.message ||
          statsError?.message ||
          "Failed to load penalty data."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Penalties</h1>
          <p className="text-gray-600">
            Track, apply, and manage penalty charges against tenants
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={handleDateRangeChange}
            align="end"
          />

          <Button
            variant="outline"
            className="h-11"
            onClick={() => setIsSettingsModalOpen(true)}
          >
            <Settings className="mr-2 w-4 h-4" />
            Settings
          </Button>

          <PermissionGate codename="add_penalties" showFallback={false}>
            <Button onClick={handleAddPenalty} className="h-11">
              <Plus className="mr-2 w-4 h-4" />
              Add Penalty
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={AlertTriangle}
          title="Total Penalties"
          value={totalPenalties}
        />
        <FeatureCard
          icon={TrendingUp}
          title="Pending"
          value={pendingPenalties}
        />
        <FeatureCard
          icon={AlertTriangle}
          title="Total Amount"
          value={totalAmount}
        />
        <FeatureCard
          icon={TrendingUp}
          title="Waived Amount"
          value={waivedAmount}
        />
      </div>

      {/* Data Table */}
      <div className="">
        <DataTable
          columns={columns}
          data={{
            data: {
              count: penaltyCount,
              results: penaltyData,
            },
          }}
          isLoading={isListLoading}
          isError={isListError}
          options={filterOptions}
          tableKey="penalties"
          searchableColumnIds={["penalty_number", "tenant.name"]}
          searchableColumnsSetters={[() => {}]}
        />
      </div>

      {/* Modals */}
      <AddPenaltyModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <PenaltySettingsModal
        open={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {selectedPenalty && (
        <>
          <ViewPenaltyModal
            open={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedPenalty(null);
            }}
            penalty={selectedPenalty}
          />

          <EditPenaltyModal
            open={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedPenalty(null);
            }}
            penalty={selectedPenalty}
          />

          <WaivePenaltyModal
            open={isWaiveModalOpen}
            onClose={() => {
              setIsWaiveModalOpen(false);
              setSelectedPenalty(null);
            }}
            penalty={selectedPenalty}
          />

          <AddToInvoiceModal
            open={isAddToInvoiceModalOpen}
            onClose={() => {
              setIsAddToInvoiceModalOpen(false);
              setSelectedPenalty(null);
            }}
            penalty={selectedPenalty}
          />

          <DeletePenaltyModal
            open={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedPenalty(null);
            }}
            penalty={selectedPenalty}
            onConfirm={handleConfirmDelete}
          />
        </>
      )}
    </div>
  );
};

export default Penalties;
