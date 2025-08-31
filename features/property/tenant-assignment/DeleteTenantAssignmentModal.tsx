import { AlertTriangle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { deletePropertyTenantAssignment } from '@/actions/clients/tenantDashboard';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TenantAssignment } from './types';

const deleteConfirmationSchema = z
  .object({ confirmation: z.string() })
  .refine((data) => data.confirmation === "DELETE", {
    message: "Please type DELETE",
    path: ["confirmation"],
  });

type DeleteConfirmationForm = z.infer<typeof deleteConfirmationSchema>;

interface DeleteTenantAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  assignment: TenantAssignment | null;
  onDeleted?: () => void;
  onAssignmentsUpdated?: () => void;
}

const DeleteTenantAssignmentModal: React.FC<DeleteTenantAssignmentModalProps> = ({
  open,
  onClose,
  assignment,
  onDeleted,
  onAssignmentsUpdated,
}) => {
  const queryClient = useQueryClient();
  const form = useForm<DeleteConfirmationForm>({
    resolver: zodResolver(deleteConfirmationSchema),
    defaultValues: { confirmation: "" },
  });

  const { mutate: deleteAssignmentMutation, isPending } = useMutation({
    mutationFn: async () => {
      if (!assignment) throw new Error("Assignment is required");
      return deletePropertyTenantAssignment(assignment.id);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message, {
          className: "bg-primary text-white",
        });
        queryClient.invalidateQueries({ queryKey: ["property-tenants"] });
        onAssignmentsUpdated?.();
        onClose();
        onDeleted?.();
        form.reset();
      } else {
        toast.error(result.message, { className: "bg-destructive text-white" });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message, { className: "bg-destructive text-white" });
    },
  });

  if (!assignment) return null;

  // Compose property/unit info string
  const propertyInfo = assignment.node
    ? assignment.node.name
    : 'property';

  const onSubmit = (data: DeleteConfirmationForm) => {
    if (data.confirmation === "DELETE") {
      deleteAssignmentMutation();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-8 max-w-md rounded-2xl border-0 shadow-2xl">
        <DialogHeader className="mb-2">
          <div className="flex flex-col gap-2 items-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <DialogTitle className="text-2xl font-bold tracking-tight text-center text-red-600">
              Delete Tenant Assignment
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="mb-4 text-lg font-semibold text-center text-gray-900">
          Are you sure you want to delete the assignment for
          <span className="font-bold text-red-700"> '{assignment.tenant_user.first_name} {assignment.tenant_user.last_name}' </span>
          to
          <span className="font-bold text-primary"> '{propertyInfo}' </span>
          ?
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-700">
                    Please type <span className="font-bold text-red-600">DELETE</span> to confirm
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      placeholder="Type DELETE"
                      autoFocus
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-4 justify-center items-center mt-4 text-sm text-gray-500">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <span>
                <span className="font-semibold text-red-500">Warning:</span> This action cannot be undone. All data for this assignment will be permanently deleted.
              </span>
            </div>
            <DialogFooter className="flex flex-row gap-3 justify-center mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                style={{ backgroundColor: "#dc2626", color: "#fff" }}
                className="min-w-[100px] font-bold"
                disabled={!form.formState.isValid || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteTenantAssignmentModal; 