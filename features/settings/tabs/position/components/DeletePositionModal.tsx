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
import { Alert, AlertDescription } from "@/components/ui/alert";

import type { PositionTableItem } from "../../../schema/position";

interface DeletePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  position: PositionTableItem | null;
  isLoading?: boolean;
}

const DeletePositionModal: React.FC<DeletePositionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  position,
  isLoading = false,
}) => {
  if (!position) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Position
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this position? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting this position will affect any staff members currently assigned to it.
              Please ensure all staff members are reassigned before proceeding.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-2">Position Details</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Name:</span>{" "}
                <span className="text-gray-900">{position.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Description:</span>{" "}
                <span className="text-gray-900 line-clamp-2">{position.description}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>{" "}
                <span className="text-gray-900">
                  {new Date(position.created_at).toLocaleDateString()}
                </span>
              </div>
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
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isLoading ? "Deleting..." : "Delete Position"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePositionModal; 