import { useState } from "react";
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  MoreVertical,
  Edit,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/datatable/data-table";
import Header from "@/features/projects/profile/tabs/Components/structure/header";
import FeatureCard from "@/features/property/tabs/components/featureCard";
import { useAtom } from "jotai";
import { pageIndexAtom, pageSizeAtom } from "@/store";
import { maintenanceColumns } from "./components/columns";
import StatusChangeModal from "./components/StatusChangeModal";
import CreateMaintenanceModal from "./components/CreateMaintenanceModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMaintenanceStats,
  getMaintenanceList,
  createMaintenanceRequest,
  updateMaintenanceStatus,
  deleteMaintenanceRequest,
} from "@/actions/projects/maintenance";
import { toast } from "sonner";
import {PermissionGate} from "@/components/PermissionGate";

interface MaintenanceTableItem {
  id: string;
  title: string;
  description: string;
  project: string;
  status: string;
  priority: string;
  vendor: {
    name: string;
    email: string;
    phone: string;
  };
  created_by: string;
  created_at: string;
}

interface MaintenanceTableResponse {
  count: number;
  results: MaintenanceTableItem[];
}

type StatusChangeType = "in_progress" | "resolved" | "closed" | "delete";

interface ModalState {
  open: boolean;
  type: StatusChangeType | null;
  row: MaintenanceTableItem | null;
  loading: boolean;
}

// Status options for filtering
const statusOptions = [
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

const Maintenance = ({ projectId }: { projectId: string }) => {
  // Pagination state
  const [pageIndex, setPageIndex] = useAtom(pageIndexAtom);
  const [pageSize, setPageSize] = useAtom(pageSizeAtom);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    type: null,
    row: null,
    loading: false,
  });
  const queryClient = useQueryClient();

  // Fetch stats from backend
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["maintenance-stats", projectId],
    queryFn: () => getMaintenanceStats({ project_id: projectId }),
    enabled: !!projectId,
  });

  // Fetch table data from backend
  const {
    data: tableData,
    isLoading: isTableLoading,
    isError: isTableError,
    refetch: refetchTable,
  } = useQuery({
    queryKey: ["maintenance-list", projectId, pageIndex, pageSize],
    queryFn: async () => {
      const data = await getMaintenanceList({
        project_id: projectId,
        page: pageIndex + 1,
        page_size: pageSize,
      });
      return data;
    },
    enabled: !!projectId,
    // keepPreviousData: true, // Removed to fix linter error
  });


  // Create mutation
  const createMutation = useMutation({
    mutationFn: createMaintenanceRequest,
    onSuccess: (data) => {
      if (typeof data === 'object' && 'error' in data && data.error) {
        toast.error(String('message' in data ? data.message : 'Failed to create maintenance request'));
        return;
      }
      setCreateModalOpen(false);
      setCreateLoading(false);
      queryClient.invalidateQueries({
        queryKey: ["maintenance-list", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["maintenance-stats", projectId],
      });
      toast.success(String('message' in data ? data.message : "Maintenance request created"));
    },
    onError: (e: any) => {
      setCreateLoading(false);
      toast.error(e?.message || "Failed to create maintenance request");
    },
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateMaintenanceStatus(id, status as any),
    onSuccess: () => {
      setModalState({ open: false, type: null, row: null, loading: false });
      queryClient.invalidateQueries({
        queryKey: ["maintenance-list", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["maintenance-stats", projectId],
      });
      toast.success("Status updated");
    },
    onError: (e: any) => {
      setModalState((prev) => ({ ...prev, loading: false }));
      toast.error(e?.message || "Failed to update status");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMaintenanceRequest(id),
    onSuccess: () => {
      setModalState({ open: false, type: null, row: null, loading: false });
      queryClient.invalidateQueries({
        queryKey: ["maintenance-list", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["maintenance-stats", projectId],
      });
      toast.success("Request deleted");
    },
    onError: (e: any) => {
      setModalState((prev) => ({ ...prev, loading: false }));
      toast.error(e?.message || "Failed to delete request");
    },
  });

  // Handlers for actions
  const handleStatusChange = (
    row: MaintenanceTableItem,
    type: StatusChangeType
  ) => {
    setModalState({ open: true, type, row, loading: false });
  };
  const handleDelete = (row: MaintenanceTableItem) => {
    setModalState({ open: true, type: "delete", row, loading: false });
  };
  const handleEdit = (row: MaintenanceTableItem) => {
    alert("Edit modal placeholder");
  };

  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, open: false, loading: false }));
  };

  const handleModalConfirm = () => {
    if (!modalState.row || !modalState.type) return;
    setModalState((prev) => ({ ...prev, loading: true }));
    if (modalState.type === "delete") {
      deleteMutation.mutate(modalState.row.id);
    } else {
      statusMutation.mutate({ id: modalState.row.id, status: modalState.type });
    }
  };

  // Handler for create modal submit
  const handleCreateSubmit = (data: any) => {
    setCreateLoading(true);
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header with filters and New Request button */}
      <Header
        title="Maintenance Requests"
        description="Track, assign, and resolve maintenance issues for your project."
      >
        <div className="flex gap-3 items-center">
          <PermissionGate codename="add_maintenance" showFallback={false}>
            <Button onClick={() => setCreateModalOpen(true)} className="h-10">
              <Plus className="mr-2 w-4 h-4" />
              New Request
            </Button>
          </PermissionGate>
        </div>
      </Header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={Wrench}
          title="Total"
          value={isStatsLoading ? "..." : stats?.total ?? 0}
        />
        <FeatureCard
          icon={AlertTriangle}
          title="Urgent"
          value={isStatsLoading ? "..." : stats?.urgent ?? 0}
          desc="High priority"
        />
        <FeatureCard
          icon={Clock}
          title="Open"
          value={isStatsLoading ? "..." : stats?.open ?? 0}
          desc="Awaiting action"
        />
        <FeatureCard
          icon={CheckCircle}
          title="Resolved"
          value={isStatsLoading ? "..." : stats?.resolved ?? 0}
          desc="Completed"
        />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="flex gap-3 items-center p-4 bg-gray-50 rounded-lg">
          <Clock className="w-4 h-4" />
          <div>
            <div className="font-semibold">
              {isStatsLoading ? "..." : stats?.open ?? 0}
            </div>
            <div className="text-sm text-gray-600">Open</div>
          </div>
        </div>
        <div className="flex gap-3 items-center p-4 bg-blue-100 rounded-lg">
          <Clock className="w-4 h-4" />
          <div>
            <div className="font-semibold">
              {isStatsLoading ? "..." : stats?.in_progress ?? 0}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
        </div>
        <div className="flex gap-3 items-center p-4 bg-green-100 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          <div>
            <div className="font-semibold">
              {isStatsLoading ? "..." : stats?.resolved ?? 0}
            </div>
            <div className="text-sm text-gray-600">Resolved</div>
          </div>
        </div>
        <div className="flex gap-3 items-center p-4 bg-red-100 rounded-lg">
          <AlertTriangle className="w-4 h-4" />
          <div>
            <div className="font-semibold">
              {isStatsLoading ? "..." : stats?.closed ?? 0}
            </div>
            <div className="text-sm text-gray-600">Closed</div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={maintenanceColumns({
          onStatusChange: handleStatusChange,
          onDelete: handleDelete,
          onEdit: handleEdit,
        })}
        data={tableData && (tableData as any).data ? { data: (tableData as any).data } : { data: tableData || { count: 0, results: [] } }}
        isLoading={isTableLoading}
        isError={isTableError}
        options={statusOptions}
        tableKey="maintenance-requests"
        searchableColumnIds={[
          "title",
          "project",
          "vendor",
          "status",
          "priority",
        ]}
        searchableColumnsSetters={[() => {}]}
        isUpper={false}
      />

      {/* Status Change Modal */}
      <StatusChangeModal
        open={modalState.open}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        type={modalState.type as StatusChangeType}
        requestTitle={modalState.row?.title}
        loading={
          modalState.loading ||
          statusMutation.status === "pending" ||
          deleteMutation.status === "pending"
        }
      />

      {/* Create Maintenance Modal */}
      <CreateMaintenanceModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        loading={createLoading || createMutation.status === "pending"}
      />
    </div>
  );
};

export default Maintenance;
