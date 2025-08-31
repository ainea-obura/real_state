"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const verificationSchema = z.object({
  category: z.string().min(2, "Category is required"),
  id_number: z.string().min(2, "ID number is required"),
  document_image: z
    .any()
    .optional()
    .refine(
      (file) => file === undefined || file instanceof File,
      "Document image must be a file if provided"
    ),
  user_image: z
    .any()
    .optional()
    .refine(
      (file) => file === undefined || file instanceof File,
      "User image must be a file if provided"
    ),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

interface RegisterVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VerificationFormValues) => Promise<void>;
  initialValues?: {
    category?: string;
    id_number?: string;
  };
}

export const RegisterVerificationModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
}: RegisterVerificationModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      category: initialValues?.category || "",
      id_number: initialValues?.id_number || "",
    },
  });
  const [loading, setLoading] = useState(false);

  const handleFormSubmit = async (data: VerificationFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
      toast.success("Verification registered successfully");
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to register verification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Register Tenant Verification</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(handleFormSubmit)}
          aria-label="Register Verification Form"
        >
          <div>
            <label htmlFor="category" className="block mb-1 text-sm font-medium">
              Category
            </label>
            <select
              id="category"
              {...register("category")}
              className="px-3 py-2 w-full rounded border focus:outline-none focus:ring"
              aria-label="Verification Category"
              tabIndex={0}
              role="combobox"
              defaultValue=""
            >
              <option value="" disabled>
                Select category
              </option>
              <option value="passport">Passport</option>
              <option value="national_id">National ID</option>
              <option value="driver_license">Driver's License</option>
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="id_number" className="block mb-1 text-sm font-medium">
              ID Number
            </label>
            <input
              id="id_number"
              type="text"
              {...register("id_number")}
              className="px-3 py-2 w-full rounded border focus:outline-none focus:ring"
              aria-label="ID Number"
              tabIndex={0}
              role="textbox"
            />
            {errors.id_number && (
              <p className="mt-1 text-xs text-red-500">{errors.id_number.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="document_image" className="block mb-1 text-sm font-medium">
              Document Image
            </label>
            <input
              id="document_image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setValue("document_image", e.target.files[0]);
                }
              }}
              className="px-3 py-2 w-full rounded border focus:outline-none focus:ring"
              aria-label="Document Image"
              tabIndex={0}
              role="button"
            />
            {errors.document_image &&
              (typeof errors.document_image?.message === 'string'
                ? <p className="mt-1 text-xs text-red-500">{errors.document_image.message}</p>
                : null)
            }
          </div>

          <div>
            <label htmlFor="user_image" className="block mb-1 text-sm font-medium">
              User Image
            </label>
            <input
              id="user_image"
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setValue("user_image", e.target.files[0]);
                }
              }}
              className="px-3 py-2 w-full rounded border focus:outline-none focus:ring"
              aria-label="User Image"
              tabIndex={0}
              role="button"
            />
            {errors.user_image &&
              (typeof errors.user_image?.message === 'string'
                ? <p className="mt-1 text-xs text-red-500">{errors.user_image.message}</p>
                : null)
            }
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || isSubmitting}
              aria-label="Cancel"
              tabIndex={0}
              role="button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={loading || isSubmitting}
              aria-label="Submit Verification"
              tabIndex={0}
              role="button"
            >
              {loading || isSubmitting ? "Submitting..." : "Register"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 