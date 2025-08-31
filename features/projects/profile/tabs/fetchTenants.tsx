import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import TenantAssignmentCard from "./TenantAssignmentCard";
import { Badge } from "@/components/ui/badge";
import { getAllPropertyTenants } from "@/actions/clients/tenantDashboard";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import DeleteTenantAssignmentModal from "@/features/property/tenant-assignment/DeleteTenantAssignmentModal";
import { vacateTenantAssignment } from "@/actions/projects/tenantAssignment";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FetchTenants: React.FC<{ projectId: string }> = ({ projectId }) => {
  // Helper to get YYYY-MM for current month
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  };
  const currentMonth = getCurrentMonth();

  const {
    data: assignments,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["property-tenants", projectId],
    queryFn: async () => {
      const res = await getAllPropertyTenants(projectId);

      if (res.error) {
        throw new Error("Failed to fetch structure data");
      }

      return res.data?.results || [];
    },
    enabled: !!projectId,
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [vacateModalOpen, setVacateModalOpen] = useState(false);
  const [vacateAssignmentId, setVacateAssignmentId] = useState<string | null>(null);

  const handleDelete = (assignment: any) => {
    setSelectedAssignment(assignment);
    setDeleteModalOpen(true);
  };

  const handleDeleteModalClose = () => {
    setSelectedAssignment(null);
    setDeleteModalOpen(false);
  };

  const handleDeleted = () => {
    refetch();
    handleDeleteModalClose();
  };

  const handleVacate = (id: string) => {
    setVacateAssignmentId(id);
    setVacateModalOpen(true);
  };

  const confirmVacate = async () => {
    if (!vacateAssignmentId) return;
    
    try {
      const result = await vacateTenantAssignment(vacateAssignmentId);
      if (!result.error) {
        toast.success(result.message);
        refetch(); // Refresh the data
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to vacate tenant");
      console.error("Vacate error:", error);
    } finally {
      setVacateModalOpen(false);
      setVacateAssignmentId(null);
    }
  };

  return (
    <div className="w-full h-full">
      <DeleteTenantAssignmentModal
        open={deleteModalOpen}
        onClose={handleDeleteModalClose}
        assignment={selectedAssignment}
        onDeleted={handleDeleted}
      />
      
      {/* Vacate Confirmation Modal */}
      <Dialog open={vacateModalOpen} onOpenChange={setVacateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vacate Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to vacate this tenant? This will end their contract and mark the property as available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVacateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmVacate} className="bg-orange-600 hover:bg-orange-700">
              Vacate Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap gap-4 justify-start">
        {loading ? (
          <div className="py-8 w-full text-center text-gray-400">
            Loading tenants...
          </div>
        ) : isError ? (
          <div className="py-8 w-full text-center text-red-400">
            {error instanceof Error ? error.message : "Failed to fetch tenants"}
          </div>
        ) : !assignments || assignments.length === 0 ? (
          <div className="py-8 w-full text-center text-gray-400">
            No tenants found.
          </div>
        ) : (
          assignments.map((assignment: any) => {
            // Format rent price string
            const price = assignment.rent_amount && assignment.currency
              ? `${assignment.currency.code || assignment.currency.symbol || ''} ${assignment.rent_amount}`
              : null;
            return (
              <div key={assignment.id} className="flex-shrink-0 w-full sm:w-80 md:w-72 lg:w-80">
                <TenantAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onDelete={handleDelete}
                  onVacate={handleVacate}
                  price={price || undefined}
                  agent={assignment.agent}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FetchTenants;
