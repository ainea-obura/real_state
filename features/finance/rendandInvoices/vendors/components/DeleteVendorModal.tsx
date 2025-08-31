import { useForm } from "react-hook-form";
import { z } from "zod";
import { Vendor } from "../schema/vendorSchema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";

const deleteSchema = z.object({
  confirmation: z.string().refine((val) => val === "DELETE", {
    message: 'Type DELETE to confirm',
  }),
});
type DeleteForm = z.infer<typeof deleteSchema>;

interface DeleteVendorModalProps {
  open: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onDelete: (vendor: Vendor) => void;
  loading?: boolean;
}

export const DeleteVendorModal = ({ open, onClose, vendor, onDelete, loading }: DeleteVendorModalProps) => {
  const form = useForm<DeleteForm>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { confirmation: "" },
  });

  const handleSubmit = () => {
    if (vendor) onDelete(vendor);
    form.reset();
  };

  const handleClose = () => {
    onClose();
    form.reset();
  };

  if (!open || !vendor) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-8">
        <DialogHeader>
          <div className="flex flex-col items-center gap-2">
            <Trash2 className="w-8 h-8 text-red-500" />
            <DialogTitle className="font-bold text-2xl text-center tracking-tight text-red-500">
              Delete Vendor
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="mb-4 font-semibold text-gray-900 text-lg text-center">
          Are you sure you want to delete vendor{' '}
          <span className="font-bold text-red-500">'{vendor.name}'</span>?
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium text-gray-700 text-xs">
                    Please type <span className="font-bold text-red-500">DELETE</span> to confirm
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
            <div className="flex justify-center items-center gap-4 mt-4 text-gray-500 text-sm">
              <Trash2 className="w-8 h-8 text-red-500" />
              <span>
                <span className="font-semibold text-red-500">Warning:</span> This action cannot be undone.
              </span>
            </div>
            <DialogFooter className="flex flex-row justify-center gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="min-w-[100px] font-bold bg-red-600 text-white hover:bg-red-700"
                disabled={!form.formState.isValid || loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}; 