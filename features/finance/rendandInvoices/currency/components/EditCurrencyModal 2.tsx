import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencySchema } from "../schema/schemas";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Currency } from "../schema/types";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { fetchCurrencyById, updateCurrency } from "@/actions/finance/currency";

interface EditCurrencyModalProps {
  open: boolean;
  onClose: () => void;
  currency: Currency | null;
  onEdit: () => void;
}

const EditCurrencyModal = ({
  open,
  onClose,
  currency,
  onEdit,
}: EditCurrencyModalProps) => {
  // Fetch latest currency data by id when modal opens
  const { data: latestCurrency, isLoading: isFetching } = useQuery({
    queryKey: ["currency", currency?.id],
    queryFn: async () => {
      if (!currency?.id) return null;
      return await fetchCurrencyById(currency.id);
    },
    enabled: !!currency?.id && open,
    refetchOnWindowFocus: false,
  });

  const form = useForm<z.infer<typeof CurrencySchema>>({
    resolver: zodResolver(CurrencySchema),
    defaultValues: {
      name: currency?.name || "",
      code: currency?.code || "",
      symbol: currency?.symbol || "",
      decimalPlaces: currency?.decimalPlaces || 2,
    },
    values: latestCurrency
      ? {
          name: latestCurrency.name,
          code: latestCurrency.code,
          symbol: latestCurrency.symbol,
          decimalPlaces: latestCurrency.decimalPlaces,
        }
      : undefined,
  });

  useEffect(() => {
    if (latestCurrency) {
      form.reset({
        name: latestCurrency.name,
        code: latestCurrency.code,
        symbol: latestCurrency.symbol,
        decimalPlaces: latestCurrency.decimalPlaces,
      });
    }
  }, [latestCurrency, form]);

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof CurrencySchema>) => {
      if (!currency?.id) throw new Error("No currency selected");
      return await updateCurrency(currency.id, data);
    },
    onSuccess: (data) => {
      if(data.error){
        toast.error(data.error);
        return;
      }
      toast.success(data.message || "Currency updated successfully");
      queryClient.invalidateQueries({ queryKey: ["currency", currency?.id] });
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
      queryClient.invalidateQueries({ queryKey: ["currency-stats"] });
      onEdit();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update currency");
    },
  });

  const onSubmit = (data: z.infer<typeof CurrencySchema>) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Edit Currency
          </DialogTitle>
          <DialogDescription className="mt-2 text-gray-500">
            Update the details for this currency.
          </DialogDescription>
        </DialogHeader>
        {isFetching ? (
          <div className="py-8 text-center">Loading currency...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Name" />
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
                          placeholder="Code (e.g. USD)"
                          className="tracking-widest uppercase"
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
                        <Input {...field} placeholder="Symbol (e.g. $)" />
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
                        placeholder="Decimal Places"
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
                  disabled={mutation.status === "pending"}
                  className="px-6 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.status === "pending"}
                  className="px-6 rounded-lg"
                >
                  {mutation.status === "pending" ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditCurrencyModal;
