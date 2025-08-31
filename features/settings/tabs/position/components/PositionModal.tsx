"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { positionFormSchema, type PositionForm, type PositionTableItem } from "../../../schema/position";

interface PositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PositionForm) => void;
  position?: PositionTableItem | null;
  isLoading?: boolean;
}

const PositionModal: React.FC<PositionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  position,
  isLoading = false,
}) => {
  const form = useForm<PositionForm>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Reset form when position changes (for edit mode)
  useEffect(() => {
    if (position) {
      form.reset({
        name: position.name,
        description: position.description,
      });
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [position, form]);

  const handleSubmit = (data: PositionForm) => {
    onSubmit(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <span>{position ? "Edit Position" : "Add New Position"}</span>
          </DialogTitle>
          <DialogDescription>
            {position 
              ? "Update the position details below."
              : "Create a new position by filling in the details below."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter position name (e.g., Property Manager)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The title or name of the position within your organization.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the responsibilities and requirements for this position (optional)..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a detailed description of the position's responsibilities, requirements, and scope. This field is optional.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : position ? "Update Position" : "Create Position"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PositionModal; 