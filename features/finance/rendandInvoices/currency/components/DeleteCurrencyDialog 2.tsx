import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Currency } from "../schema/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCurrency } from "@/actions/finance/currency";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface DeleteCurrencyDialogProps {
  open: boolean;
  onClose: () => void;
  currency: Currency | null;
  onDelete: () => void;
}

const DeleteCurrencyDialog = ({ open, onClose, currency, onDelete }: DeleteCurrencyDialogProps) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      if (!currency?.id) throw new Error("No currency selected");
      return await deleteCurrency(currency.id);
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success(data.message || "Currency deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      queryClient.invalidateQueries({ queryKey: ["currency-stats"] });
      onDelete();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete currency");
    },
  });

  if (!currency) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex flex-col gap-2 justify-center items-center">
            <Trash2 className="w-12 h-12 text-red-500 drop-shadow-lg" />
            <DialogTitle className="text-2xl font-bold text-center text-red-600">
              Delete Currency?
            </DialogTitle>
            <DialogDescription className="text-lg text-center text-gray-600">
              <span className="font-semibold text-primary">{currency.name}</span> ({currency.code}) will be <span className="text-red-600 font-semibold">permanently deleted</span>.<br />
              This action cannot be undone.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="flex flex-row gap-2 justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.status === "pending"}
            className="px-6 rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.status === "pending"}
            className="px-6 rounded-lg bg-red-600 hover:bg-red-700"
          >
            {mutation.status === "pending" ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteCurrencyDialog; 