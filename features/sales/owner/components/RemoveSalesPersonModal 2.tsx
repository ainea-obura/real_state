import { AlertTriangle, Loader2, User, X } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { removeSalesPerson } from "@/actions/sales/loadProjects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface RemoveSalesPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerProperty: {
    id?: string;
    ownerName?: string;
    propertyName?: string;
    assignedSalesPerson?: {
      name?: string;
      employee_id?: string;
    };
    status?: string;
  } | null;
}

const RemoveSalesPersonModal: React.FC<RemoveSalesPersonModalProps> = ({
  isOpen,
  onClose,
  ownerProperty,
}) => {
  const queryClient = useQueryClient();
  const [isRemoving, setIsRemoving] = useState(false);

  // Use useMutation for removing sales person
  const removeSalesPersonMutation = useMutation({
    mutationFn: removeSalesPerson,
    onSuccess: (data) => {
      if (data.success) {
        console.log("✅ Sales person removed successfully!");
        console.log("Removed Sales Person:", data.data.removed_sales_person_name);
        console.log("Sale Item ID:", data.data.sale_item_id);

        // Show success toast
        toast.success("Sales Person Removed Successfully!", {
          description: `${data.data.removed_sales_person_name} has been removed from ${ownerProperty?.propertyName}`,
          duration: 5000,
        });

        // Refresh the owner properties table query
        queryClient.invalidateQueries({ queryKey: ["ownerProperties"] });

        // Close modal and reset state
        setIsRemoving(false);
        onClose();
      } else {
        console.error("❌ Sales person removal failed:", data.message);
        toast.error("Failed to Remove Sales Person", {
          description: data.message,
          duration: 5000,
        });
        setIsRemoving(false);
      }
    },
    onError: (error) => {
      console.error("❌ Mutation error:", error);
      toast.error("Unexpected Error", {
        description:
          "An unexpected error occurred while removing the sales person. Please try again.",
        duration: 5000,
      });
      setIsRemoving(false);
    },
  });

  const handleRemoveSalesPerson = async () => {
    if (!ownerProperty?.id) return;

    setIsRemoving(true);
    try {
      // Call the API to remove sales person
      removeSalesPersonMutation.mutate({
        salesItemId: ownerProperty.id,
      });
    } catch (error) {
      console.error("Error in handleRemoveSalesPerson:", error);
      setIsRemoving(false);
    }
  };

  const handleClose = () => {
    if (!isRemoving) {
      onClose();
    }
  };

  if (!ownerProperty?.assignedSalesPerson) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="mt-10 min-w-[500px] max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <User className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-xl">
                Remove Sales Person
              </h2>
              <p className="text-gray-600 text-sm">
                {ownerProperty?.ownerName} - {ownerProperty?.propertyName}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>
            You are about to remove the sales person assignment. This action will
            clear all commission settings and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-amber-800">
                  Important Warning
                </h4>
                <div className="text-sm text-amber-700 space-y-1">
                  <p>
                    <strong>Cannot remove if expenses exist:</strong> If any
                    commission expenses have been created for this sales person,
                    the removal will be blocked.
                  </p>
                  <p>
                    <strong>Commission data lost:</strong> All commission type,
                    rate, and payment settings will be permanently cleared.
                  </p>
                  <p>
                    <strong>No automatic reassignment:</strong> You will need to
                    manually assign a new sales person if needed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Current Assignment Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3">Current Assignment</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Sales Person:</span>
                <span className="font-medium text-gray-900">
                  {ownerProperty.assignedSalesPerson.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Employee ID:</span>
                <span className="font-medium text-gray-900">
                  {ownerProperty.assignedSalesPerson.employee_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Property:</span>
                <span className="font-medium text-gray-900">
                  {ownerProperty.propertyName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Owner:</span>
                <span className="font-medium text-gray-900">
                  {ownerProperty.ownerName}
                </span>
              </div>
            </div>
          </div>

          {/* Confirmation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0">
                <svg
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="text-sm text-blue-700">
                <p>
                  <strong>Confirmation required:</strong> Type "REMOVE" in the
                  field below to confirm you understand the consequences of this
                  action.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRemoving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemoveSalesPerson}
            disabled={isRemoving}
            className="flex items-center gap-2"
          >
            {isRemoving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            {isRemoving ? "Removing..." : "Remove Sales Person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveSalesPersonModal;
