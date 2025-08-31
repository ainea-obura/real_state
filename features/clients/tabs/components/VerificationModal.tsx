"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  FileText,
  User,
  Shield,
  Calendar,
  Hash,
  ImageIcon,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { updateTenantVerification } from "@/actions/clients/tenantDashboard";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  verification: {
    id: string | null;
    status: string;
    id_number: string | null;
    category: string | null;
    document_image: string | null;
    user_image: string | null;
    created_at: string | null;
  } | null;
  onEdit?: () => void;
  isLoading?: boolean;
  tenantId: string;
}

export const VerificationModal = ({
  isOpen,
  onClose,
  verification,
  onEdit,
  isLoading = false,
  tenantId,
}: VerificationModalProps) => {
  const [isLoadingState, setIsLoadingState] = useState(false);
  const [uploadedDocImage, setUploadedDocImage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (!verification?.id) {
      toast.error("No verification ID found.");
      return;
    }
    setIsLoadingState(true);
    try {
      const result = await updateTenantVerification(verification.id, action);
      if (result.success) {
        toast.success(result.message);
        await queryClient.invalidateQueries({ queryKey: ["tenant-dashboard"] });
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to update verification status");
    } finally {
      setIsLoadingState(false);
    }
  };

  // Dropzone logic for document image upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedDocImage(reader.result as string);
        toast.success("Document image uploaded (not yet saved)");
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  const docImage = uploadedDocImage || verification?.document_image;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex flex-col items-center justify-center min-h-[200px]">
          <div className="mb-4 w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <span className="text-sm text-gray-600">Loading verification details...</span>
        </DialogContent>
      </Dialog>
    );
  }
  if (!verification) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex flex-col items-center justify-center min-h-[200px]">
          <span className="text-sm text-gray-600">No verification data found for this tenant.</span>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="overflow-y-auto w-full max-w-lg">
          <DialogHeader className="pb-4">
            <div className="flex gap-3 items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="flex gap-2 items-center text-2xl font-bold">
                  Verification Details
                  <Badge className={`ml-2 px-3 py-1 text-sm font-medium ${getStatusColor(verification.status)}`}>{verification.status}</Badge>
                </DialogTitle>
                <p className="text-base text-gray-500">Review and manage tenant verification</p>
              </div>
            </div>
          </DialogHeader>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
            {/* User Photo Card */}
            <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
              {verification.user_image ? (
                <img
                  src={verification.user_image}
                  alt="User Photo"
                  aria-label="User Photo"
                  className="object-cover mb-2 w-40 h-40 rounded-lg border-2 border-blue-200"
                />
              ) : (
                <div className="flex justify-center items-center mb-2 w-40 h-40 bg-gray-100 rounded-lg border-2 border-gray-300 border-dashed">
                  <ImageIcon className="w-10 h-10 text-gray-400" />
                </div>
              )}
              {verification.user_image && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(verification.user_image!, "_blank")}
                  aria-label="View Full Size User Photo"
                >
                  View Full Size
                </Button>
              )}
              <span className="mt-2 text-xs text-center text-gray-500">User Photo</span>
            </div>
            {/* Document/Passport Card */}
            <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border border-purple-100">
              {docImage ? (
                <img
                  src={docImage}
                  alt="Document or Passport"
                  aria-label="Document or Passport"
                  className="object-cover mb-2 w-40 h-40 rounded-lg border-2 border-purple-200"
                />
              ) : (
                <div className="flex justify-center items-center mb-2 w-40 h-40 bg-gray-100 rounded-lg border-2 border-gray-300 border-dashed">
                  <ImageIcon className="w-10 h-10 text-gray-400" />
                </div>
              )}
              {docImage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(docImage, "_blank")}
                  aria-label="View Full Size Document or Passport"
                >
                  View Full Size
                </Button>
              )}
              <span className="mt-2 text-xs text-center text-gray-500">Document / Passport</span>
            </div>
          </div>

          {/* Identity Information */}
          <div className="mb-6">
            <div className="flex gap-2 items-center mb-2">
              <Hash className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold">Identity Information</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="mb-1 text-sm text-gray-500">ID Number</p>
                <p className="px-3 py-2 font-medium text-gray-900 bg-gray-50 rounded-md">
                  {verification.id_number || "Not provided"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-500">Document Type</p>
                <p className="px-3 py-2 font-medium text-gray-900 capitalize bg-gray-50 rounded-md">
                  {verification.category || "Not specified"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm text-gray-500">Created At</p>
                <div className="flex gap-1 items-center px-3 py-2 text-sm text-gray-500 bg-gray-50 rounded-md">
                  <Calendar className="w-4 h-4" />
                  {verification.created_at ? format(new Date(verification.created_at), "MMM dd, yyyy") : "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 border-t" />

          {/* Action Buttons - Bottom Row */}
          <div className="flex flex-wrap gap-4 justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={onClose} disabled={isLoadingState} size="icon" aria-label="Cancel">
                  <X className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="text-white bg-green-600 hover:bg-green-700"
                  onClick={() => handleAction("approve")}
                  disabled={isLoadingState || verification.status.toLowerCase() === "approved"}
                  size="icon"
                  aria-label="Approve"
                >
                  <Check className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Approve Verification</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  onClick={() => handleAction("reject")}
                  disabled={isLoadingState || verification.status.toLowerCase() === "rejected"}
                  size="icon"
                  aria-label="Reject"
                >
                  <X className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reject Verification</TooltipContent>
            </Tooltip>
            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="text-yellow-700 bg-yellow-100 border-none hover:bg-yellow-200"
                    onClick={onEdit}
                    disabled={isLoadingState}
                    size="icon"
                    aria-label="Edit"
                  >
                    <Pencil className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Verification</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Loading State */}
          {isLoadingState && (
            <div className="flex justify-center items-center py-4">
              <div className="w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
              <span className="ml-2 text-sm text-gray-600">Processing...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
