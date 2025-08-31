import { AlertTriangle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';

const deleteDocumentConfirmationSchema = z
  .object({ confirmation: z.string() })
  .refine((data) => data.confirmation === "DELETE", {
    message: "Please type DELETE to confirm",
    path: ["confirmation"],
  });

type DeleteDocumentConfirmationForm = z.infer<
  typeof deleteDocumentConfirmationSchema
>;

interface DeleteDocumentModalProps {
  open: boolean;
  onClose: () => void;
  document: {
    id: string;
    title: string;
  } | null;
  onDeleted?: () => void;
  isPending?: boolean;
  onConfirm: () => void;
}

const DeleteDocumentModal: React.FC<DeleteDocumentModalProps> = ({
  open,
  onClose,
  document,
  onDeleted,
  isPending,
  onConfirm,
}) => {
  const form = useForm<DeleteDocumentConfirmationForm>({
    resolver: zodResolver(deleteDocumentConfirmationSchema),
    defaultValues: { confirmation: "" },
  });

  if (!document) return null;

  const onSubmit = (data: DeleteDocumentConfirmationForm) => {
    if (data.confirmation === "DELETE") {
      onConfirm();
      onDeleted?.();
      onClose();
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="shadow-2xl p-8 border-0 rounded-2xl max-w-md">
        <DialogHeader className="mb-2">
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <DialogTitle className="font-bold text-red-600 text-2xl text-center tracking-tight">
              Delete Document
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="mb-4 font-semibold text-gray-900 text-lg text-center">
          Are you sure you want to delete{" "}
          <span className="font-bold text-red-700">'{document.title}'</span>?
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
                This action cannot be undone.
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
                  "Delete Document"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteDocumentModal;
