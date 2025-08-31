import { ParkingSquare, Plus, Trash } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    deleteAllUnitAssignments, deleteSlotAssignment, fetchSlotAssignments, SlotAssignmentGroup,
} from '@/actions/projects/basement';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import AssignmentModal from './components/AssignmentModal';

const Basement = ({ projectId }: { projectId: string }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["slot-assignments", projectId],
    queryFn: async () => {
      const res = await fetchSlotAssignments(projectId);
      const result = res as {
        error?: boolean;
        message?: string;
        data?: SlotAssignmentGroup[];
      };
      if (result.error)
        throw new Error(result.message || "Failed to fetch assignments");
      return result.data as SlotAssignmentGroup[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteSlotMutation = useMutation({
    mutationFn: deleteSlotAssignment,
    onSuccess: (res: unknown) => {
      const response = res as { error?: boolean; message?: string };
      if (response.error) {
        toast.error(response.message || "Failed to delete slot");
      } else {
        toast.success(response.message || "Slot deleted");
        queryClient.invalidateQueries({
          queryKey: ["slot-assignments", projectId],
        });
      }
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      toast.error(error.message || "Failed to delete slot");
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllUnitAssignments,
    onSuccess: (res: unknown) => {
      const response = res as { error?: boolean; message?: string };
      if (response.error) {
        toast.error(response.message || "Failed to delete all slots");
      } else {
        toast.success(response.message || "All slots deleted");
        queryClient.invalidateQueries({
          queryKey: ["slot-assignments", projectId],
        });
      }
    },
    onError: (err: unknown) => {
      const error = err as { message?: string };
      toast.error(error.message || "Failed to delete all slots");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 justify-between items-start sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Parking Slot Assignments</h2>
          <p className="text-muted-foreground">
            Manage which units are assigned to which Parking slots.
          </p>
        </div>
        <PermissionGate codename="add_basement" showFallback={false}>
          <Button
            className="flex gap-2 items-center h-10 text-white rounded-md transition-all duration-300 ease-in-out cursor-pointer bg-primary hover:bg-primary/90"
            onClick={() => setModalOpen(true)}
            aria-label="Assign slot to unit"
            tabIndex={0}
            role="button"
          >
            <Plus className="w-4 h-4" />
            Assign Slot
          </Button>
        </PermissionGate>
      </div>
      {isLoading ? (
        <div className="py-8 text-center text-gray-400">
          Loading assignments…
        </div>
      ) : error ? (
        <div className="py-8 text-center text-red-500">
          {error.message || "Error loading assignments."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(data || []).map((row) => (
            <div
              key={row.unit_id}
              className="flex flex-col gap-3 p-4 bg-white"
              style={{ boxShadow: "none", border: "none" }}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-2 items-center">
                  <ParkingSquare className="w-4 h-4 text-gray-500" />
                  <span className="text-base font-semibold text-gray-900 truncate">
                    {row.unit_name}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete all slots"
                  tabIndex={0}
                  onClick={() =>
                    deleteAllMutation.mutate({ unit_id: row.unit_id })
                  }
                  className="text-red-400 hover:text-red-700"
                >
                  <PermissionGate
                    codename="delete_basement"
                    showFallback={false}
                  >
                    <Trash className="w-5 h-5" />
                  </PermissionGate>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.slots.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No slots assigned
                  </span>
                ) : (
                  row.slots.map((slot) => (
                    <span
                      key={slot.slot_id}
                      className="inline-flex items-center bg-yellow-100 px-2 py-0.5 rounded font-medium text-yellow-800 text-xs"
                    >
                      {slot.slot_name}
                      <PermissionGate
                        codename="delete_basement"
                        showFallback={false}
                      >
                        <button
                          aria-label="Delete slot"
                          className="ml-1 text-red-400 hover:text-red-700"
                          onClick={() =>
                            deleteSlotMutation.mutate({
                              slot_id: slot.slot_id,
                              unit_id: row.unit_id,
                            })
                          }
                          tabIndex={0}
                          type="button"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </PermissionGate>
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <AssignmentModal
        open={modalOpen}
        onOpenChange={(open: boolean) => {
          setModalOpen(open);
          if (!open) refetch();
        }}
        projectId={projectId}
      />
    </div>
  );
};

export default Basement;
