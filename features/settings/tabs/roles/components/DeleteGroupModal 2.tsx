"use client";

import React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Users, AlertTriangle } from "lucide-react";

import type { Group } from "../schema";

interface DeleteGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  group: Group | null;
  isLoading?: boolean;
}

const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  group,
  isLoading = false,
}) => {
  if (!group) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Group
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the group{" "}
            <span className="font-semibold">
              {group.is_position_group ? group.position_name : group.name}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Group Details:</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-2 font-medium">
                {group.is_position_group ? "Position Group" : "Custom Group"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Users:</span>
              <span className="ml-2 font-medium">{group.user_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Permissions:</span>
              <span className="ml-2 font-medium">{group.permission_count}</span>
            </div>
          </div>

          {group.user_count > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
              <Users className="w-4 h-4" />
              <span>
                Warning: This group has {group.user_count} user(s) assigned. 
                Deleting it will remove all user assignments.
              </span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : "Delete Group"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteGroupModal; 