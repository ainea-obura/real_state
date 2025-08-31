"use client";

import { AlertTriangle, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { waivePenalty } from '@/actions/finance/penalties';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface WaivePenaltyModalProps {
  open: boolean;
  onClose: () => void;
  penalty: ModalPenalty;
}

// Zod validation schema for waiver form
const waiverSchema = z.object({
  waived_reason: z.string().min(1, "Waiver reason is required"),
});

type WaiverFormData = z.infer<typeof waiverSchema>;

const WaivePenaltyModal = ({
  open,
  onClose,
  penalty,
}: WaivePenaltyModalProps) => {
  const queryClient = useQueryClient();

  // Waive penalty mutation
  const waivePenaltyMutation = useMutation({
    mutationFn: async (data: WaiverFormData) => {
      return await waivePenalty(data, penalty.id);
    },
    onSuccess: () => {
      // Invalidate and refetch penalties list
      queryClient.invalidateQueries({ queryKey: ["penalties-list"] });
      queryClient.invalidateQueries({ queryKey: ["penalties-stats"] });

      toast.success("Penalty waived successfully");
      onClose();
    },
    onError: (error: Error) => {
      
      toast.error(error.message || "Failed to waive penalty");
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WaiverFormData>({
    resolver: zodResolver(waiverSchema),
    defaultValues: {
      waived_reason: "",
    },
  });

  const onSubmit = async (data: WaiverFormData) => {
    waivePenaltyMutation.mutate(data);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "late_payment":
        return "Late Payment Fee";
      case "returned_payment":
        return "Returned Payment Fee";
      case "lease_violation":
        return "Lease Violation Fee";
      case "utility_overcharge":
        return "Utility Overcharge";
      default:
        return "Other";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="mt-10 max-w-md h-[calc(100vh-100px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-600" />
            Waive Penalty
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Warning Alert */}
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You are about to waive a penalty. This action cannot be undone.
            </AlertDescription>
          </Alert>

          {/* Penalty Information */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900">Penalty Details</h3>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Penalty Number:</span>
                <p className="font-medium">{penalty.penaltyNumber}</p>
              </div>

              <div>
                <span className="text-gray-600">Tenant:</span>
                <p className="font-medium">{penalty.tenant.name}</p>
              </div>

              <div>
                <span className="text-gray-600">Property:</span>
                <p className="font-medium">
                  {penalty.property.unit.split(" -> ").slice(-1)[0]}
                  <span className="text-gray-400 text-xs">
                    {" "}
                    ({penalty.property.projectName})
                  </span>
                </p>
              </div>

              <div>
                <span className="text-gray-600">Type:</span>
                <p className="font-medium">
                  {getTypeLabel(penalty.penaltyType)}
                </p>
              </div>

              <div>
                <span className="text-gray-600">Amount:</span>
                <p className="font-medium">
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
                </p>
              </div>
            </div>
          </div>

          {/* Waiver Reason */}
          <div className="space-y-2">
            <Label className="font-medium text-gray-700 text-sm">
              Reason for Waiver *
            </Label>
            <Textarea
              placeholder="Please provide a reason for waiving this penalty..."
              className="bg-white border-gray-200"
              rows={4}
              {...register("waived_reason")}
            />
            {errors.waived_reason && (
              <p className="text-red-500 text-xs">
                {errors.waived_reason.message}
              </p>
            )}
            <p className="text-gray-500 text-xs">
              This reason will be recorded for audit purposes.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={waivePenaltyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={waivePenaltyMutation.isPending}
            >
              {waivePenaltyMutation.isPending ? "Waiving..." : "Waive Penalty"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WaivePenaltyModal;
