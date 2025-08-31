import { AlertTriangle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { deleteNode } from '@/actions/projects/structure';
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

import { StructureNode } from '../schema/projectStructureSchema';

const deleteConfirmationSchema = z
  .object({ confirmation: z.string() })
  .refine((data) => data.confirmation === "DELETE", {
    message: "Please type DELETE to confirm",
    path: ["confirmation"],
  });

type DeleteConfirmationForm = z.infer<typeof deleteConfirmationSchema>;

interface DeleteNodeModalProps {
  open: boolean;
  onClose: () => void;
  node: {
    id: string;
    name: string;
    node_type: string;
    projectId: string;
  } | null;
  onDeleted?: () => void;
  onStructureUpdated: (newTree: StructureNode[]) => void;
}

function removeNodeFromTree(
  tree: StructureNode[],
  nodeId: string
): StructureNode[] {
  return tree
    .filter((node) => node.id !== nodeId)
    .map((node) => ({
      ...node,
      children: node.children
        ? removeNodeFromTree(node.children as StructureNode[], nodeId)
        : [],
    }));
}

const DeleteNodeModal: React.FC<DeleteNodeModalProps> = ({
  open,
  onClose,
  node,
  onDeleted,
  onStructureUpdated,
}) => {
  const queryClient = useQueryClient();
  const form = useForm<DeleteConfirmationForm>({
    resolver: zodResolver(deleteConfirmationSchema),
    defaultValues: { confirmation: "" },
  });

  const { mutate: deleteNodeMutation, isPending } = useMutation({
    mutationFn: async () => {
      if (!node) throw new Error("Node is required");
      return deleteNode(
        node.id,
        node.node_type as
          | "BLOCK"
          | "FLOOR"
          | "UNIT"
          | "ROOM"
          | "HOUSE"
          | "BASEMENT",
        node.projectId
      );
    },
    onSuccess: (response: {
      error: boolean;
      data: { count: number; results: StructureNode[] };
    }) => {
      toast.success("Node deleted successfully", {
        className: "bg-primary text-white",
      });
      onStructureUpdated(response.data.results as StructureNode[]);
      onClose();
      onDeleted?.();
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message, { className: "bg-destructive text-white" });
    },
  });

  if (!node) return null;

  const onSubmit = (data: DeleteConfirmationForm) => {
    if (data.confirmation === "DELETE") {
      deleteNodeMutation();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="shadow-2xl p-8 border-0 rounded-2xl max-w-md">
        <DialogHeader className="mb-2">
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <DialogTitle className="font-bold text-red-600 text-2xl text-center tracking-tight">
              Delete{" "}
              {node.node_type.charAt(0) + node.node_type.slice(1).toLowerCase()}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="mb-4 font-semibold text-gray-900 text-lg text-center">
          Are you sure you want to delete{" "}
          <span className="font-bold text-red-700">
            &apos;{node.name}&apos;
          </span>
          ?
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
                This action cannot be undone. All data for this node will be
                permanently deleted.
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
                    Deleting...
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

export default DeleteNodeModal;
