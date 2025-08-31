"use client";

import { Shield, Users, X, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getUserPermissions } from "@/actions/settings/staff";
import type { UserPermissions } from "@/features/settings/schema/staff";

interface DynamicUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  modalType: "groups" | "permissions";
}

const DynamicUserModal = ({
  isOpen,
  onClose,
  userId,
  userName,
  modalType,
}: DynamicUserModalProps) => {
  // Fetch user permissions (contains both groups and permissions data)
  const {
    data: permissionsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      const response = await getUserPermissions(userId);
      if (response.error) {
        throw new Error(response.message || "Failed to load user data");
      }
      console.log("response.data", response.data);
      return response.data as UserPermissions;
    },
    enabled: isOpen && !!userId,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            {modalType === "groups" ? (
              <Users className="w-5 h-5" />
            ) : (
              <Shield className="w-5 h-5" />
            )}
            {modalType === "groups" ? "Groups" : "Permissions"} for {userName}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 w-8 h-8 rounded-full border-2 border-gray-200 animate-spin border-t-primary"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-red-600">Error loading {modalType}</p>
            </div>
          ) : permissionsData ? (
            <div>
              {modalType === "groups" ? (
                // Groups List
                <div>
                  {permissionsData.groups &&
                  permissionsData.groups.length > 0 ? (
                    <ul className="space-y-2">
                      {permissionsData.groups.map((group) => (
                        <li
                          key={group.id}
                          className="p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="font-medium">{group.name}</div>
                          <div className="text-sm text-gray-500">
                            {group.permission_count} permissions
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-8 text-center text-gray-500">
                      No groups assigned
                    </p>
                  )}
                </div>
              ) : (
                // Permissions List
                <div>
                  {permissionsData.all_permissions &&
                  permissionsData.all_permissions.length > 0 ? (
                    <div>
                      <div className="mb-4 text-sm text-gray-600">Show us</div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {permissionsData.all_permissions.map(
                          (permission, index) => (
                            <div key={permission.id} className="text-sm">
                              <div className="text-sm font-medium text-gray-900">
                                {index + 1}. {permission.name}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-gray-500">
                      No permissions found
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DynamicUserModal;
