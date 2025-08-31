"use client";

import { AlertTriangle, Building, Calendar, DollarSign, FilePenLine } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { updatePenalty } from '@/actions/finance/penalties';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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
  currency_info?: {
    id: string;
    code: string;
    name: string;
    symbol: string;
  } | null;
}

interface EditPenaltyModalProps {
  open: boolean;
  onClose: () => void;
  penalty: ModalPenalty;
}

// Zod validation schema
const editPenaltySchema = z.object({
  penalty_type: z.enum([
    "late_payment",
    "returned_payment",
    "lease_violation",
    "utility_overcharge",
    "other",
  ]),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
  tenant_notes: z.string().optional(),
});

type EditPenaltyFormData = z.infer<typeof editPenaltySchema>;

const EditPenaltyModal = ({
  open,
  onClose,
  penalty,
}: EditPenaltyModalProps) => {
  const queryClient = useQueryClient();

  // Update penalty mutation
  const updatePenaltyMutation = useMutation({
    mutationFn: async (data: EditPenaltyFormData) => {
      return await updatePenalty(
        {
          penalty_type: data.penalty_type,
          amount: data.amount,
          due_date: data.due_date,
          notes: data.notes || "",
          tenant_notes: data.tenant_notes || "",
        },
        penalty.id
      );
    },
    onSuccess: () => {
      // Invalidate and refetch penalties list
      queryClient.invalidateQueries({ queryKey: ["penalties-list"] });
      queryClient.invalidateQueries({ queryKey: ["penalties-stats"] });

      toast.success("Penalty updated successfully");
      onClose();
    },
    onError: (error: Error) => {
      
      toast.error(error.message || "Failed to update penalty");
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditPenaltyFormData>({
    resolver: zodResolver(editPenaltySchema),
    defaultValues: {
      penalty_type: penalty.penaltyType,
      amount: penalty.amount,
      due_date: penalty.dueDate.split("T")[0], // Convert to date string
      notes: penalty.notes || "",
      tenant_notes: penalty.tenantNotes || "",
    },
  });

  const onSubmit = async (data: EditPenaltyFormData) => {
    updatePenaltyMutation.mutate(data);
  };

  const penaltyType = watch("penalty_type");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="min-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <FilePenLine className="w-5 h-5" />
            Edit Penalty - {penalty.penaltyNumber}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Penalty Information */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="mb-3 font-semibold text-gray-900">
                Penalty Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tenant:</span>
                  <span className="font-medium">{penalty.tenant.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Property:</span>
                  <div className="flex gap-2 items-center">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">
                      {penalty.property.unit.split(" -> ").slice(-1)[0]}
                      <span className="text-xs text-gray-400">
                        {" "}
                        ({penalty.property.projectName})
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge
                    variant="outline"
                    className="text-green-700 bg-green-50 border-green-200"
                  >
                    {penalty.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Currency:</span>
                  <span className="font-medium">
                    {penalty.currency_info?.name || "USD"}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Penalty Type
                  </Label>
                  <Select
                    value={penaltyType}
                    onValueChange={(value) =>
                      setValue(
                        "penalty_type",
                        value as
                          | "late_payment"
                          | "returned_payment"
                          | "lease_violation"
                          | "utility_overcharge"
                          | "other"
                      )
                    }
                  >
                    <SelectTrigger className="bg-white border-gray-200 w-full !h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="late_payment">
                        <div className="flex gap-2 items-center">
                          <Calendar className="w-4 h-4" />
                          Late Payment Fee
                        </div>
                      </SelectItem>
                      <SelectItem value="returned_payment">
                        <div className="flex gap-2 items-center">
                          <DollarSign className="w-4 h-4" />
                          Returned Payment Fee
                        </div>
                      </SelectItem>
                      <SelectItem value="lease_violation">
                        <div className="flex gap-2 items-center">
                          <AlertTriangle className="w-4 h-4" />
                          Lease Violation Fee
                        </div>
                      </SelectItem>
                      <SelectItem value="utility_overcharge">
                        <div className="flex gap-2 items-center">
                          <DollarSign className="w-4 h-4" />
                          Utility Overcharge
                        </div>
                      </SelectItem>
                      <SelectItem value="other">
                        <div className="flex gap-2 items-center">
                          <AlertTriangle className="w-4 h-4" />
                          Other
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.penalty_type && (
                    <p className="text-xs text-red-500">
                      {errors.penalty_type.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="bg-white border-gray-200"
                    placeholder="50.00"
                    {...register("amount", { 
                      valueAsNumber: true,
                      onChange: (e) => {
                        const value = e.target.value;
                        if (value === '') {
                          e.target.value = '';
                        } else {
                          const parsed = parseFloat(value);
                          if (!isNaN(parsed) && parsed >= 0) {
                            e.target.value = value;
                          } else {
                            e.target.value = e.target.value.replace(/[^0-9.]/g, '');
                          }
                        }
                      }
                    })}
                  />
                  {errors.amount && (
                    <p className="text-xs text-red-500">
                      {errors.amount.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Due Date
                </Label>
                <Input
                  type="date"
                  className="bg-white border-gray-200"
                  {...register("due_date")}
                />
                {errors.due_date && (
                  <p className="text-xs text-red-500">
                    {errors.due_date.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Internal Notes
                </Label>
                <Textarea
                  placeholder="Internal notes about this penalty..."
                  className="bg-white border-gray-200"
                  rows={3}
                  {...register("notes")}
                />
                {errors.notes && (
                  <p className="text-xs text-red-500">{errors.notes.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Tenant Notes
                </Label>
                <Textarea
                  placeholder="Notes visible to the tenant..."
                  className="bg-white border-gray-200"
                  rows={3}
                  {...register("tenant_notes")}
                />
                {errors.tenant_notes && (
                  <p className="text-xs text-red-500">
                    {errors.tenant_notes.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updatePenaltyMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updatePenaltyMutation.isPending}>
              {updatePenaltyMutation.isPending
                ? "Updating..."
                : "Update Penalty"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPenaltyModal;
