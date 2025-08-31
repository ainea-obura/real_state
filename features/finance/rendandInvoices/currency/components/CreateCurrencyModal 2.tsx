import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencySchema } from "../schema/schemas";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCurrency } from "@/actions/finance/currency";
import { toast } from "sonner";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

interface CreateCurrencyModalProps {
  open: boolean;
  onClose: () => void;
  onCreate?: (data: any) => void;
}

const initialForm = { name: "", code: "", symbol: "", decimalPlaces: 2 };

type FormData = z.infer<typeof CurrencySchema>;

const CreateCurrencyModal = ({ open, onClose, onCreate }: CreateCurrencyModalProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(CurrencySchema),
    defaultValues: initialForm,
  });

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await createCurrency({
        name: data.name,
        code: data.code,
        symbol: data.symbol,
        decimal_places: data.decimalPlaces,
      });
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success(data.message || "Currency created successfully");
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      queryClient.invalidateQueries({ queryKey: ["currency-stats"] });
      if (onCreate) onCreate(data);
      form.reset(initialForm);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create currency");
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const isSubmitting = mutation.status === "pending";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Add a New Currency
          </DialogTitle>
          <DialogDescription className="mt-2 text-gray-500">
            Register a currency for invoices and transactions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="currency-name"
                      placeholder="Name"
                      autoComplete="off"
                      className="focus:ring-2 focus:ring-primary/40"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-4 md:flex-row">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        id="currency-code"
                        placeholder="Code (e.g. USD)"
                        autoComplete="off"
                        className="tracking-widest uppercase focus:ring-2 focus:ring-primary/40"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Symbol</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        id="currency-symbol"
                        placeholder="Symbol (e.g. $)"
                        autoComplete="off"
                        className="focus:ring-2 focus:ring-primary/40"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="decimalPlaces"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decimal Places</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      max={6}
                      id="currency-decimalPlaces"
                      placeholder="Decimal Places"
                      autoComplete="off"
                      className="focus:ring-2 focus:ring-primary/40"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex flex-row gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-6 rounded-lg"
              >
                {isSubmitting ? "Adding..." : "Add Currency"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCurrencyModal;
