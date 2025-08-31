import { AlertTriangle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { deletePropertyOwnership } from '@/actions/clients/ownerDashboardAction';
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

const deleteOwnershipConfirmationSchema = z
  .object({ confirmation: z.string() })
  .refine((data) => data.confirmation === "DELETE", {
    message: "Please type DELETE to confirm",
    path: ["confirmation"],
  });

type DeleteOwnershipConfirmationForm = z.infer<
  typeof deleteOwnershipConfirmationSchema
>;

interface DeletePropertyOwnershipModalProps {
  open: boolean;
  onClose: () => void;
  property: {
    id: string;
    name: string;
    node_type: string;
    owner_name: string;
    projectId: string;
  } | null;
  onDeleted?: () => void;
}

const DeletePropertyOwnershipModal: React.FC<
  DeletePropertyOwnershipModalProps
> = ({ open, onClose, property, onDeleted }) => {
  const queryClient = useQueryClient();
  const form = useForm<DeleteOwnershipConfirmationForm>({
    resolver: zodResolver(deleteOwnershipConfirmationSchema),
    defaultValues: { confirmation: "" },
  });

  const { mutate: deleteOwnershipMutation, isPending } = useMutation({
    mutationFn: async () => {
      if (!property) throw new Error("Property is required");

      console.log("🔍 Property Ownership Delete Request:", {
        nodeId: property.id,
        projectDetailId: property.projectId,
        propertyName: property.name,
        nodeType: property.node_type,
        ownerName: property.owner_name,
      });

      const result = await deletePropertyOwnership(
        property.id,
        property.projectId
      );

      

      if (!result.success) {
        throw new Error(result.error || "Failed to delete property ownership");
      }

      return result;
    },
    onSuccess: (data) => {
      
      toast.success("Property ownership removed successfully", {
        className: "bg-primary text-white",
      });
      onDeleted?.();
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      
      toast.error(error.message, { className: "bg-destructive text-white" });
    },
  });

  if (!property) return null;

  const onSubmit = (data: DeleteOwnershipConfirmationForm) => {
    if (data.confirmation === "DELETE") {
      deleteOwnershipMutation();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="shadow-2xl p-8 border-0 rounded-2xl max-w-md">
        <DialogHeader className="mb-2">
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <DialogTitle className="font-bold text-red-600 text-2xl text-center tracking-tight">
              Remove Property Ownership
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="mb-4 font-semibold text-gray-900 text-lg text-center">
          Are you sure you want to remove ownership of{" "}
          <span className="font-bold text-red-700">
            &apos;{property.name}&apos;
          </span>{" "}
          from{" "}
          <span className="font-bold text-blue-700">
            &apos;{property.owner_name}&apos;
          </span>
          ?
        </div>
        <div className="mb-4 text-center">
          <span className="inline-block bg-gray-100 px-3 py-1 rounded-full font-medium text-gray-700 text-sm">
            {property.node_type}
          </span>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-gray-700 text-xs">
                    Please type{" "}
                    <span className="font-bold text-red-600">DELETE</span> to
                    confirm
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                      placeholder="Type DELETE"
                      autoFocus
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-center items-center gap-4 mt-4 text-gray-500 text-sm">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <span>
                <span className="font-semibold text-red-500">Warning:</span>{" "}
                This will only remove the ownership relationship. The property
                structure will remain intact.
              </span>
            </div>
            <DialogFooter className="flex flex-row justify-center gap-3 mt-6">
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
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />{" "}
                    Removing...
                  </>
                ) : (
                  "Remove Ownership"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePropertyOwnershipModal;
