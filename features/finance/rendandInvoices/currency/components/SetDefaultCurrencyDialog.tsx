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
import { setDefaultCurrency } from "@/actions/finance/currency";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface SetDefaultCurrencyDialogProps {
  open: boolean;
  onClose: () => void;
  currency: Currency | null;
  onSetDefault: () => void;
}

const SetDefaultCurrencyDialog = ({
  open,
  onClose,
  currency,
  onSetDefault,
}: SetDefaultCurrencyDialogProps) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      if (!currency?.id) throw new Error("No currency selected");
      return await setDefaultCurrency(currency.id);
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success(data.message || "Currency set as default.");
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      queryClient.invalidateQueries({ queryKey: ["currency-stats"] });
      onSetDefault();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to set default currency");
    },
  });

  if (!currency) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex flex-col gap-2 justify-center items-center">
            <Star className="w-12 h-12 text-yellow-400 drop-shadow-lg" />
            <DialogTitle className="text-2xl font-bold text-center">
              Set as Default Currency?
            </DialogTitle>
            <DialogDescription className="text-lg text-center text-gray-600">
              Are you sure you want to set{" "}
              <span className="font-semibold text-primary">
                {currency.name}
              </span>{" "}
              ({currency.code}) as the default currency? <br />
              This will unset default for all other currencies.
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
            variant="default"
            onClick={() => mutation.mutate()}
            disabled={mutation.status === "pending"}
            className="px-6 text-black bg-yellow-400 rounded-lg hover:bg-yellow-500"
          >
            {mutation.status === "pending" ? "Setting..." : "Set as Default"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SetDefaultCurrencyDialog;
