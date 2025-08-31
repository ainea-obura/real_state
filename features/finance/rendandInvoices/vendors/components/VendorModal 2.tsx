import { useEffect } from "react";
import { z } from "zod";
import { Vendor } from "../schema/vendorSchema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVendor, updateVendor } from "@/actions/finance/vendor";
import { toast } from "sonner";

const vendorSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone is required"),
  type: z.enum(["company", "individual"]).default("company"), // <-- Add type to schema
});
type VendorForm = z.infer<typeof vendorSchema>;

interface VendorModalProps {
  open: boolean;
  onClose: () => void;
  initialVendor?: Vendor | null;
  onCreated?: () => void;
}

export const VendorModal = ({
  open,
  onClose,
  initialVendor,
  onCreated,
}: VendorModalProps) => {
  const form = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: initialVendor?.name || "",
      email: initialVendor?.email || "",
      phone: initialVendor?.phone || "",
      type: initialVendor?.type || "company", // <-- Add type default
    },
  });

  useEffect(() => {
    form.reset({
      name: initialVendor?.name || "",
      email: initialVendor?.email || "",
      phone: initialVendor?.phone || "",
      type: initialVendor?.type || "company", // <-- Add type reset
    });
  }, [initialVendor, form]);

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: (data) => {
      if(data.error){
        toast.error(data.message);
        return;
      }
      toast.success("Vendor created successfully");
      form.reset();
      onClose();
      queryClient.invalidateQueries({ queryKey: ["vendor-table"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-stats"] });
      onCreated?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const updateMutation = useMutation({
    mutationFn: async (data: VendorForm) => {
      if (!initialVendor) throw new Error("No vendor to update");
      if (!initialVendor.id || typeof initialVendor.id !== "string") {
        // eslint-disable-next-line no-console
        
        throw new Error("Invalid vendor id for update");
      }
      return updateVendor(initialVendor.id, data);
    },
    onSuccess: (data) => {
      if(data.error){
        toast.error(data.message);
        return;
      }
      toast.success("Vendor updated successfully");
      form.reset();
      onClose();
      queryClient.invalidateQueries({ queryKey: ["vendor-table"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-stats"] });
      onCreated?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (data: VendorForm) => {
    if (initialVendor) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden p-0 max-w-md rounded-2xl border-0 shadow-2xl">
        <div className="px-8 pt-8 pb-2 bg-gradient-to-br from-blue-50 to-white border-b">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-bold text-center text-blue-900">
              {initialVendor ? "Update Vendor" : "Add Vendor"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-center text-gray-600">
              {initialVendor
                ? "Edit vendor details and keep your records up to date."
                : "Register a new vendor to track property expenses and contacts."}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-8 py-6 bg-white">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-800">
                      Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Vendor name"
                        autoFocus
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-800">
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Email address"
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-800">
                      Phone
                    </FormLabel>
                    <FormControl>
                      <Controller
                        name="phone"
                        control={form.control}
                        render={({ field }) => (
                          <PhoneInput
                            country={"ke"}
                            value={field.value}
                            onChange={field.onChange}
                            inputClass="w-full h-11"
                            inputStyle={{ width: "100%", height: "44px" }}
                            specialLabel=""
                            disabled={isPending}
                            enableSearch={true}
                            searchPlaceholder="Search country"
                          />
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-800">
                      Vendor Type
                    </FormLabel>
                    <FormControl>
                      <select {...field} className="px-3 w-full h-11 rounded border">
                        <option value="company">Company</option>
                        <option value="individual">Individual</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 justify-end pt-4">
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
                  disabled={isPending || !form.formState.isValid}
                  className="min-w-[100px] font-semibold"
                >
                  {isPending
                    ? initialVendor
                      ? "Updating..."
                      : "Saving..."
                    : initialVendor
                    ? "Update"
                    : "Add"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
