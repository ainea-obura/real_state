"use client";

import { useState } from "react";
import { Shield, Users, X, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { getUserPermissions } from "@/actions/settings/staff";
import { UserPermissions, userPermissionSchema } from "@/features/settings/schema/staff";

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

// Helper function to group permissions by content_type
const groupPermissionsByContentType = (permissions: typeof userPermissionSchema._type[]) => {
  const grouped = permissions.reduce((acc, permission) => {
    const key = `${permission.content_type.app_label}_${permission.content_type.model}`;
    if (!acc[key]) {
      acc[key] = {
        app_label: permission.content_type.app_label,
        model: permission.content_type.model,
        display_name: `${permission.content_type.app_label} - ${permission.content_type.model}`,
        permissions: []
      };
    }
    acc[key].permissions.push(permission);
    return acc;
  }, {} as Record<string, {
    app_label: string;
    model: string;
    display_name: string;
    permissions: typeof userPermissionSchema._type[];
  }>);

  return Object.values(grouped);
};

const UserPermissionsModal = ({ isOpen, onClose, userId, userName }: UserPermissionsModalProps) => {
  const [openApps, setOpenApps] = useState<Record<string, boolean>>({});

  // Fetch user permissions
  const {
    data: permissionsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      const response = await getUserPermissions(userId);
      if (response.error) {
        throw new Error(response.message || "Failed to load user permissions");
      }
      return response.data as UserPermissions;
    },
    enabled: isOpen && !!userId,
  });

  const toggleAppCollapse = (appLabel: string) => {
    setOpenApps(prev => ({
      ...prev,
      [appLabel]: !prev[appLabel]
    }));
  };

  // Get shortcut names for actions
  const getShortcutName = (permission: typeof userPermissionSchema._type) => {
    const codename = permission.codename.toLowerCase();
    if (codename === 'create') return 'Create';
    if (codename === 'update') return 'Update';
    if (codename === 'delete') return 'Delete';
    if (codename === 'view') return 'View';
    // For specific permissions, extract action from codename
    if (codename.includes('add_')) return 'Add';
    if (codename.includes('change_')) return 'Change';
    if (codename.includes('delete_')) return 'Delete';
    if (codename.includes('view_')) return 'View';
    return permission.name;
  };

  // Group permissions by content_type for display
  const groupedPermissions = permissionsData?.all_permissions 
    ? groupPermissionsByContentType(permissionsData.all_permissions)
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <Shield className="w-5 h-5" />
            Permissions for {userName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 w-10 h-10 rounded-full border-2 border-gray-200 animate-spin border-t-primary"></div>
            <p className="font-medium text-gray-600">Loading permissions...</p>
            <p className="mt-1 text-sm text-gray-500">Please wait while we fetch the latest data</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-red-50 rounded-full">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Error loading permissions</h3>
            <p className="text-gray-500">Failed to load permissions. Please try again.</p>
          </div>
        ) : permissionsData ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="permissions">All Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex gap-2 items-center text-lg">
                      <Users className="w-5 h-5 text-blue-500" />
                      Groups
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {permissionsData.groups.length}
                    </div>
                    <p className="text-sm text-gray-500">Assigned groups</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex gap-2 items-center text-lg">
                      <Shield className="w-5 h-5 text-green-500" />
                      Total Permissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {permissionsData.all_permissions.length}
                    </div>
                    <p className="text-sm text-gray-500">Unique permissions</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Direct Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  {permissionsData.direct_permissions.length > 0 ? (
                    <div className="space-y-2">
                      {permissionsData.direct_permissions.map((permission) => (
                        <div key={permission.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{getShortcutName(permission)}</div>
                            <div className="text-sm text-gray-500">
                              {permission.content_type.app_label} - {permission.content_type.model}
                            </div>
                          </div>
                          <Badge variant="outline">{permission.codename}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-gray-500">No direct permissions assigned</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Groups</CardTitle>
                </CardHeader>
                <CardContent>
                  {permissionsData.groups.length > 0 ? (
                    <div className="space-y-3">
                      {permissionsData.groups.map((group) => (
                        <div key={group.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div>
                            <div className="font-medium text-blue-900">{group.name}</div>
                            <div className="text-sm text-blue-600">{group.permission_count} permissions included</div>
                          </div>
                          <Badge variant="secondary">{group.permission_count} perms</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-gray-500">No groups assigned</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Permissions (Grouped by App & Model)</CardTitle>
                </CardHeader>
                <CardContent>
                  {groupedPermissions.length > 0 ? (
                    <div className="space-y-4">
                      {groupedPermissions.map((category) => (
                        <div key={`${category.app_label}_${category.model}`} className="overflow-hidden bg-white rounded-lg border border-gray-100">
                          {/* App Header */}
                          <div className="p-4 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                              <div className="flex gap-3 items-center">
                                <button
                                  onClick={() => toggleAppCollapse(category.app_label)}
                                  className="p-2 rounded-lg transition-all duration-200 hover:bg-gray-50"
                                >
                                  {openApps[category.app_label] ? (
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                  )}
                                </button>
                                <div className="flex gap-3 items-center">
                                  <div className="flex justify-center items-center w-8 h-8 rounded-lg bg-primary/10">
                                    <Shield className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <h3 className="text-base font-semibold text-gray-900 capitalize">
                                      {category.display_name}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                      {category.permissions.length} permissions
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Permissions List */}
                          {openApps[category.app_label] && (
                            <div className="p-4">
                              <div className="grid grid-cols-2 gap-2">
                                {category.permissions.map((permission) => (
                                  <div key={permission.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                    <div>
                                      <div className="font-medium">{getShortcutName(permission)}</div>
                                      <div className="text-xs text-gray-500">{permission.codename}</div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {permission.content_type.model}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-gray-500">No permissions found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default UserPermissionsModal; 