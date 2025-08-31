"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAtom, useAtomValue } from "jotai";
import { X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isAgencyModelOpen, selectedAgencyAtom } from "@/store";
import { ClientFormSchema, type ClientFormValues } from "./types";
import { useEffect } from "react";
import { createAgency, updateAgency } from "@/actions/clients";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const AddAgency = () => {
  const [isOpen, setIsOpen] = useAtom(isAgencyModelOpen);
  const selectedAgency = useAtomValue(selectedAgencyAtom);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(ClientFormSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      gender: "Male",
    },
  });

  const isEditing = !!selectedAgency.data;

  useEffect(() => {
    if (isEditing && selectedAgency.data) {
      form.reset({
        email: selectedAgency.data.email,
        first_name: selectedAgency.data.first_name,
        last_name: selectedAgency.data.last_name,
        phone: selectedAgency.data.phone || "",
        gender: selectedAgency.data.gender,
      });
    } else {
      form.reset({
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        gender: "Male",
      });
    }
  }, [isEditing, selectedAgency.data, form]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createAgency,
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success(data.message || "Agency created successfully");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      form.reset();
    },
    onError: (error: any) => {
      // Handle both error objects and response data with error flag
      const errorMessage = error?.message || error?.data?.message || "Failed to create agency";
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ClientFormValues }) =>
      updateAgency(id, values),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message);
        return;
      }
      toast.success(data.message || "Agency updated successfully");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      form.reset();
    },
    onError: (error: any) => {
      // Handle both error objects and response data with error flag
      const errorMessage = error?.message || error?.data?.message || "Failed to update agency";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (values: ClientFormValues) => {
    // Handle empty email values
    const processedValues = {
      ...values,
      email: values.email?.trim() || "",
    };
    
    if (isEditing && selectedAgency.data) {
      updateMutation.mutate({ id: selectedAgency.data.id, values: processedValues });
    } else {
      createMutation.mutate(processedValues);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            {isEditing ? "Edit Agent" : "Add New Agent"}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-0 w-6 h-6"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter email address (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter first name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter last name" {...field} />
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
                  <FormLabel>Phone Number</FormLabel>
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
                          disabled={createMutation.isPending || updateMutation.isPending}
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
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-4 space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update Agent"
                  : "Create Agent"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAgency; 