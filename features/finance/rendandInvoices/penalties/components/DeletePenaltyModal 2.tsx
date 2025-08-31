"use client";

import { AlertTriangle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { deletePenalty } from '@/actions/finance/penalties';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Use the ModalPenalty interface from parent component
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

interface DeletePenaltyModalProps {
  open: boolean;
  onClose: () => void;
  penalty: ModalPenalty;
}

// Zod validation schema for delete form
const deleteSchema = z.object({
  delete_confirmation: z
    .string()
    .min(1, "Please type 'DELETE' to confirm")
    .refine((val) => val === "DELETE", {
      message: "Please type 'DELETE' to confirm",
    }),
});

type DeleteFormData = {
  delete_confirmation: string;
};

const DeletePenaltyModal = ({
  open,
  onClose,
  penalty,
}: DeletePenaltyModalProps) => {
  const queryClient = useQueryClient();

  // Delete penalty mutation
  const deletePenaltyMutation = useMutation({
    mutationFn: async () => {
      return await deletePenalty(penalty.id);
    },
    onSuccess: () => {
      // Invalidate and refetch penalties list
      queryClient.invalidateQueries({ queryKey: ["penalties-list"] });
      queryClient.invalidateQueries({ queryKey: ["penalties-stats"] });

      toast.success("Penalty deleted successfully");
      onClose();
    },
    onError: (error: Error) => {
      
      toast.error(error.message || "Failed to delete penalty");
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DeleteFormData>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      delete_confirmation: "",
    },
  });

  const deleteConfirmation = watch("delete_confirmation");
  const isDeleteButtonDisabled = deleteConfirmation !== "DELETE";

  const onSubmit = async () => {
    deletePenaltyMutation.mutate();
  };

  if (!penalty) return null;

  const getPenaltyTypeLabel = (type: string) => {
    const typeLabels = {
      late_payment: "Late Payment",
      returned_payment: "Returned Payment",
      lease_violation: "Lease Violation",
      utility_overcharge: "Utility Overcharge",
      other: "Other",
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      pending: "Pending",
      applied_to_invoice: "Applied to Invoice",
      waived: "Waived",
      paid: "Paid",
    };
    return statusLabels[status as keyof typeof statusLabels] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex justify-center items-center bg-red-100 rounded-full w-10 h-10">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="font-semibold text-lg">
                Delete Penalty
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the
                penalty record.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Warning Alert */}
          <div className="flex items-start gap-3 bg-red-50 p-4 border border-red-200 rounded-lg">
            <AlertTriangle className="flex-shrink-0 mt-0.5 w-5 h-5 text-red-600" />
            <div className="text-red-800 text-sm">
              <p className="font-medium">Warning</p>
              <p>
                Deleting this penalty will remove it from all records and cannot
                be recovered. If this penalty has been applied to an invoice or
                affects tenant balances, those records will need to be updated
                separately.
              </p>
            </div>
          </div>

          {/* Penalty Details */}
          <div className="bg-gray-50 p-4 border rounded-lg">
            <h4 className="mb-3 font-medium text-gray-900">Penalty Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Penalty Number:</span>
                <span className="font-medium">{penalty.penaltyNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tenant:</span>
                <span className="font-medium">{penalty.tenant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Property:</span>
                <span className="font-medium">
                  {penalty.property.unit.split(" -> ").slice(-1)[0]}
                  <span className="text-gray-400 text-xs">
                    {" "}
                    ({penalty.property.projectName})
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">
                  {getPenaltyTypeLabel(penalty.penaltyType)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">
                  {penalty.amountType === "percentage"
                    ? `${penalty.amount}%`
                    : penalty.amount}
                  {penalty.amountType === "percentage" &&
                    penalty.percentageOf && (
                      <span className="text-gray-500">
                        {" "}
                        of {penalty.percentageOf}
                      </span>
                    )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">
                  {getStatusLabel(penalty.status)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date Issued:</span>
                <span className="font-medium">
                  {new Date(penalty.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Delete Confirmation */}
          <div className="space-y-2">
            <Label
              htmlFor="delete-confirmation"
              className="font-medium text-sm"
            >
              Type &quot;DELETE&quot; to confirm{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="delete-confirmation"
              placeholder="Type 'DELETE' to confirm deletion..."
              className="uppercase"
              {...register("delete_confirmation")}
            />
            {errors.delete_confirmation && (
              <p className="text-red-500 text-xs">
                {errors.delete_confirmation.message}
              </p>
            )}
            <p className="text-gray-500 text-xs">
              This action cannot be undone. Please type &quot;DELETE&quot; to
              confirm.
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={deletePenaltyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={
                deletePenaltyMutation.isPending || isDeleteButtonDisabled
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePenaltyMutation.isPending
                ? "Deleting..."
                : "Delete Penalty"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePenaltyModal;
