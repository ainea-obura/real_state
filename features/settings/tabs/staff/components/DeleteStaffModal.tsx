"use client";

import { AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StaffTableItem } from "../../../schema/staff";

interface DeleteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  staff: StaffTableItem | null;
  isLoading?: boolean;
}

const DeleteStaffModal: React.FC<DeleteStaffModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  staff,
  isLoading = false,
}) => {
  if (!staff) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Staff Member
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this staff member? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Name:</span>
                <span>{staff.first_name} {staff.last_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Email:</span>
                <span>{staff.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Position:</span>
                <span>{staff.position.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Warning</p>
              <p>Deleting this staff member will remove their access to the system and all associated data.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete Staff Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteStaffModal; 