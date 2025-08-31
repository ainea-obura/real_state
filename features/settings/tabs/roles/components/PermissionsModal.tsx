"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shield,
  Search,
  Filter,
  CheckSquare,
  Square,
  Save,
  RotateCcw,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Building2,
} from "lucide-react";
import {
  Group,
  Permission,
  PermissionCategory,
  PermissionFilter,
} from "../schema";
import { toast } from "sonner";

// Import API actions
import {
  getGroupPermissionsAction,
  getAllPermissionsAction,
  updateGroupPermissionsAction,
} from "@/actions/users/perms";

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup: Group | null;
  onPermissionsUpdate: (groupId: number, permissionIds: number[]) => void;
  isLoading?: boolean;
  isStandalone?: boolean;
}

const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  selectedGroup,
  onPermissionsUpdate,
  isLoading = false,
  isStandalone = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [openApp, setOpenApp] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // React Query for group permissions
  const {
    data: groupPermissionsData,
    isLoading: isLoadingGroupPermissions,
    error: groupPermissionsError,
  } = useQuery({
    queryKey: ["groupPermissions", selectedGroup?.id],
    queryFn: async () => {
      if (!selectedGroup) return null;
      const response = await getGroupPermissionsAction(selectedGroup.id);
      if (response.error) {
        throw new Error(response.message || "Failed to load group permissions");
      }
      return response.data;
    },
    enabled: !!selectedGroup,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // React Query for all permissions
  const {
    data: allPermissionsData,
    isLoading: isLoadingAllPermissions,
    error: allPermissionsError,
  } = useQuery({
    queryKey: ["allPermissions"],
    queryFn: async () => {
      const response = await getAllPermissionsAction();
      if (response.error) {
        throw new Error(response.message || "Failed to load all permissions");
      }
      return response.data?.results || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Process group permissions
  const currentGroupPermissions = useMemo(() => {
    if (!groupPermissionsData?.permissions) return [];
    return groupPermissionsData.permissions
      .filter((p: any) => p.is_checked)
      .map((p: any) => p.id);
  }, [groupPermissionsData]);

  // Process all permissions and categories
  const { permissions, appLabels } = useMemo(() => {
    if (!allPermissionsData) {
      return { permissions: [], appLabels: [] };
    }

    const allPermissions = allPermissionsData;

    // Extract unique app labels
    const uniqueAppLabels = Array.from(
      new Set(allPermissions.map((p: any) => p.app_label))
    ).map((app: unknown) => ({
      value: app as string,
      label: (app as string).charAt(0).toUpperCase() + (app as string).slice(1),
    }));

    return {
      permissions: allPermissions.flatMap((cat: any) => cat.permissions || []),
      appLabels: uniqueAppLabels,
    };
  }, [allPermissionsData]);

  // Mutation for updating group permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: ({
      groupId,
      permissionIds,
    }: {
      groupId: number;
      permissionIds: number[];
    }) => updateGroupPermissionsAction(groupId, permissionIds),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.message || "Failed to update permissions");
      } else {
        toast.success("Permissions updated successfully!");
        // Success - invalidate queries to refetch data
        queryClient.invalidateQueries({
          queryKey: ["groupPermissions", selectedGroup?.id],
        });
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        // Call the parent callback if provided
        if (onPermissionsUpdate) {
          onPermissionsUpdate(selectedGroup!.id, selectedPermissions);
        }
        // Close the modal
        onClose();
      }
    },
    onError: (error) => {
      toast.error("An error occurred while updating permissions");
      
    },
  });

  // Initialize selected permissions when current group permissions change
  React.useEffect(() => {
    setSelectedPermissions(currentGroupPermissions);
  }, [currentGroupPermissions]);



  // Early return after all hooks
  if (!selectedGroup) return null;

  // Handle permission selection
  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  // Save changes
  const handleSave = () => {
    if (!selectedGroup) return;

    // Use the mutation to save permissions
    updatePermissionsMutation.mutate({
      groupId: selectedGroup.id,
      permissionIds: selectedPermissions,
    });
  };

  // Reset to current state
  const handleReset = () => {
    setSelectedPermissions(currentGroupPermissions);
  };

  // Toggle category collapse state (accordion behavior)
  const toggleCategoryCollapse = (category: string) => {
    setOpenApp((prev) => (prev === category ? null : category));
  };

  // Group permissions by model and category
  const groupedPermissions = useMemo(() => {
    if (!allPermissionsData) return {};

    const grouped: Record<string, Record<string, any[]>> = {};

    // Flatten all permissions from all categories
    const allPermissions = allPermissionsData.flatMap(
      (cat: any) => cat.permissions || []
    );

    // Debug: Log what permissions we actually have
    console.log(
      "Available permissions from backend:",
      allPermissions.map((p: any) => p.codename)
    );

    // Group permissions by model and category
    allPermissions.forEach((permission: any) => {
      const codename = permission.codename;
      let categoryName = "Other";
      let modelName = "Other";

      // Extract category and model from codename
      if (
        codename.startsWith("view_") ||
        codename.startsWith("add_") ||
        codename.startsWith("edit_") ||
        codename.startsWith("delete_")
      ) {
        const parts = codename.split("_");
        if (parts.length >= 2) {
          // Determine model name (usually the first part after action)
          if (parts[1] === "projects") {
            modelName = "Projects";
          } else if (parts[1] === "structure") {
            modelName = "Structure";
          } else if (parts[1] === "tenants") {
            modelName = "Tenants";
          } else if (parts[1] === "owners") {
            modelName = "Owners";
          } else if (parts[1] === "services") {
            modelName = "Services";
          } else if (parts[1] === "payments") {
            modelName = "Payments";
          } else if (parts[1] === "maintenance") {
            modelName = "Maintenance";
          } else if (parts[1] === "basement") {
            modelName = "Basement";
          } else {
            modelName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
          }

          // Determine category based on the model
          if (modelName === "Projects") {
            if (parts[2] === "profile") {
              categoryName = "Project Profile";
            } else {
              categoryName = "Project";
            }
          } else {
            categoryName = modelName;
          }
        }
      } else {
        categoryName = "Other";
        modelName = "Other";
      }

      if (!grouped[categoryName]) {
        grouped[categoryName] = {};
      }
      if (!grouped[categoryName][modelName]) {
        grouped[categoryName][modelName] = [];
      }
      grouped[categoryName][modelName].push(permission);
    });

    // Debug: Log the final grouping
    

    return grouped;
  }, [allPermissionsData]);

  // Apply filters to grouped permissions
  const filteredGroupedPermissions = useMemo(() => {
    if (!groupedPermissions || Object.keys(groupedPermissions).length === 0)
      return {};

    let filtered = { ...groupedPermissions };

    // Filter by search term only
    if (searchTerm) {
      filtered = Object.keys(filtered).reduce((acc, category) => {
        const categoryModels = filtered[category];
        const filteredModels: Record<string, any[]> = {};

        Object.keys(categoryModels).forEach((model) => {
          const permissions = categoryModels[model].filter(
            (perm: any) =>
              perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              perm.codename.toLowerCase().includes(searchTerm.toLowerCase())
          );
          if (permissions.length > 0) {
            filteredModels[model] = permissions;
          }
        });

        if (Object.keys(filteredModels).length > 0) {
          acc[category] = filteredModels;
        }
        return acc;
      }, {} as Record<string, Record<string, any[]>>);
    }

    return filtered;
  }, [
    groupedPermissions,
    searchTerm,
  ]);



  // Extract action type from codename
  const getActionType = (codename: string) => {
    if (codename.includes("add_")) return "add";
    if (codename.includes("change_") || codename.includes("edit_"))
      return "edit";
    if (codename.includes("delete_")) return "delete";
    if (codename.includes("view_")) return "view";
    return "other";
  };

  // Get the main permission for each action type (avoid duplicates)
  const getMainPermissionForAction = (
    permissions: any[],
    actionType: string
  ) => {
    const actionPermissions = permissions.filter(
      (p: any) => getActionType(p.codename) === actionType
    );
    // Return the first one (usually the main one)
    return actionPermissions[0] || null;
  };

  // Group permissions by action type
  const groupPermissionsByAction = (permissions: any[]) => {
    const grouped = {
      add: [] as any[],
      edit: [] as any[],
      delete: [] as any[],
      view: [] as any[],
      other: [] as any[],
    };

    permissions.forEach((permission: any) => {
      const actionType = getActionType(permission.codename);
      grouped[actionType as keyof typeof grouped].push(permission);
    });

    return grouped;
  };

  // Check if all permissions are selected (global select all)
  const isAllPermissionsSelected = () => {
    const allFilteredPermissions = Object.values(filteredGroupedPermissions)
      .flatMap((models) => Object.values(models))
      .flat();
    const allPermissionIds = allFilteredPermissions.map((p: any) => p.id);
    return allPermissionIds.length > 0 && allPermissionIds.every((id: number) =>
      selectedPermissions.includes(id)
    );
  };

  // Check if some permissions are selected (global partial selection)
  const isSomePermissionsSelected = () => {
    const allFilteredPermissions = Object.values(filteredGroupedPermissions)
      .flatMap((models) => Object.values(models))
      .flat();
    const allPermissionIds = allFilteredPermissions.map((p: any) => p.id);
    const selectedCount = allPermissionIds.filter((id: number) =>
      selectedPermissions.includes(id)
    ).length;
    return selectedCount > 0 && selectedCount < allPermissionIds.length;
  };

  // Handle global select all toggle
  const handleGlobalSelectAll = (checked: boolean) => {
    const allFilteredPermissions = Object.values(filteredGroupedPermissions)
      .flatMap((models) => Object.values(models))
      .flat();
    const allPermissionIds = allFilteredPermissions.map((p: any) => p.id);

    setSelectedPermissions((prev) => {
      if (checked) {
        const newPermissions = [...prev];
        allPermissionIds.forEach((id: number) => {
          if (!newPermissions.includes(id)) {
            newPermissions.push(id);
          }
        });
        return newPermissions;
      } else {
        return prev.filter((id: number) => !allPermissionIds.includes(id));
      }
    });
  };

  // Check if category is fully selected
  const isCategoryFullySelected = (category: string) => {
    const categoryModels = filteredGroupedPermissions[category] || {};
    const allPermissions = Object.values(categoryModels).flat();
    const permissionIds = allPermissions.map((p: any) => p.id);
    return permissionIds.every((id: number) =>
      selectedPermissions.includes(id)
    );
  };

  // Check if category is partially selected
  const isCategoryPartiallySelected = (category: string) => {
    const categoryModels = filteredGroupedPermissions[category] || {};
    const allPermissions = Object.values(categoryModels).flat();
    const permissionIds = allPermissions.map((p: any) => p.id);
    const selectedCount = permissionIds.filter((id: number) =>
      selectedPermissions.includes(id)
    ).length;
    return selectedCount > 0 && selectedCount < permissionIds.length;
  };

  // Handle category toggle (all permissions in a category)
  const handleCategoryToggle = (category: string, checked: boolean) => {
    const categoryModels = filteredGroupedPermissions[category] || {};
    const allPermissions = Object.values(categoryModels).flat();
    const permissionIds = allPermissions.map((p: any) => p.id);

    setSelectedPermissions((prev) => {
      if (checked) {
        const newPermissions = [...prev];
        permissionIds.forEach((id: number) => {
          if (!newPermissions.includes(id)) {
            newPermissions.push(id);
          }
        });
        return newPermissions;
      } else {
        return prev.filter((id: number) => !permissionIds.includes(id));
      }
    });
  };

  const content = (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Summary Row - Top */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">
              {selectedPermissions.length}
            </span>{" "}
            permissions selected
            {selectedPermissions.length !== currentGroupPermissions.length && (
              <span className="ml-2 text-primary">
                (
                {selectedPermissions.length > currentGroupPermissions.length
                  ? "+"
                  : ""}
                {selectedPermissions.length - currentGroupPermissions.length}{" "}
                changes)
              </span>
            )}
          </div>
          {selectedPermissions.length !== currentGroupPermissions.length && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-gray-700 border-gray-200 hover:bg-gray-50"
            >
              <RotateCcw className="mr-2 w-4 h-4" />
              Reset Changes
            </Button>
          )}
        </div>

        {/* Advanced Filters Row */}
        <div className="p-6 bg-white rounded-lg border border-gray-100">
          <div className="flex gap-3 justify-between items-center mb-4">
            <div className="flex gap-3 items-center">
              <div className="flex justify-center items-center w-10 h-10 rounded-lg bg-primary/10">
                <Filter className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Filters & Search
                </h3>
                <p className="text-sm text-gray-500">
                  Find and filter permissions
                  {searchTerm ? (
                    <span className="inline-flex items-center px-2 py-1 ml-2 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      Active
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {searchTerm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                  }}
                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  <X className="mr-2 w-4 h-4" />
                  Clear Search
                </Button>
              ) : null}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={
                  updatePermissionsMutation.isPending ||
                  isLoading ||
                  isLoadingGroupPermissions ||
                  isLoadingAllPermissions
                }
                className="bg-primary hover:bg-primary/90"
              >
                <Save className="mr-2 w-4 h-4" />
                {updatePermissionsMutation.isPending ||
                isLoading ||
                isLoadingGroupPermissions ||
                isLoadingAllPermissions
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
            </div>
          </div>

          <div className="flex gap-4 justify-between items-center">
            {/* Search on the left */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
              <Input
                placeholder={`Search permissions... (${selectedPermissions.length} selected)`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>


          </div>
        </div>

        {/* Global Select All */}
        {Object.keys(filteredGroupedPermissions).length > 0 && (
          <div className="p-4 bg-gradient-to-r rounded-lg border from-primary/5 to-primary/10 border-primary/20">
            <div className="flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <div className="flex justify-center items-center w-10 h-10 rounded-lg bg-primary/20">
                  <CheckSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Select All Permissions
                  </h3>
                  <p className="text-sm text-gray-600">
                    Select or deselect all permissions across all categories
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <Checkbox
                  checked={isAllPermissionsSelected()}
                  ref={(el) => {
                    if (el) {
                      (el as any).indeterminate = isSomePermissionsSelected();
                    }
                  }}
                  onCheckedChange={(checked) =>
                    handleGlobalSelectAll(checked as boolean)
                  }
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Permissions List */}
        <div className="space-y-6">
          {isLoadingGroupPermissions || isLoadingAllPermissions ? (
            <div className="py-16 text-center bg-white rounded-lg border border-gray-100">
              <div className="mx-auto mb-4 w-10 h-10 rounded-full border-2 border-gray-200 animate-spin border-t-primary"></div>
              <p className="font-medium text-gray-600">
                Loading permissions...
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Please wait while we fetch the latest data
              </p>
            </div>
          ) : (
            Object.entries(filteredGroupedPermissions).map(
              ([category, models]) => (
                <div
                  key={category}
                  className="overflow-hidden bg-white rounded-lg border border-gray-100"
                >
                  {/* Category Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3 items-center">
                        <button
                          onClick={() => toggleCategoryCollapse(category)}
                          className="p-2 rounded-lg transition-all duration-200 hover:bg-gray-50"
                        >
                          {openApp === category ? (
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
                            <h3 className="text-base font-semibold text-gray-900">
                              {category}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {Object.values(models).flat().length} permissions
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Category Select All */}
                      <div className="flex gap-2 items-center">
                        <Checkbox
                          checked={isCategoryFullySelected(category)}
                          ref={(el) => {
                            if (el) {
                              (el as any).indeterminate =
                                isCategoryPartiallySelected(category);
                            }
                          }}
                          onCheckedChange={(checked) =>
                            handleCategoryToggle(category, checked as boolean)
                          }
                        />
                        <span className="text-sm text-gray-600">
                          Select All
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Models List */}
                  {openApp === category && (
                    <div className="p-4">
                      <div className="space-y-3">
                        {Object.entries(models).map(([model, permissions]) => {
                          const modelName =
                            model.charAt(0).toUpperCase() + model.slice(1);

                          return (
                            <div key={model}>
                              {/* Model Row */}
                              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200 transition-colors hover:bg-white hover:shadow-sm">
                                {/* Model Name */}
                                <div className="flex items-center gap-3 min-w-[150px]">
                                  <span className="font-medium text-gray-900">
                                    {modelName}
                                  </span>
                                </div>

                                {/* Individual Permission Checkboxes */}
                                <div className="flex flex-wrap gap-4 items-start">
                                  {permissions.map((permission: any) => {
                                    const isChecked =
                                      selectedPermissions.includes(
                                        permission.id
                                      );
                                    const isCurrent =
                                      currentGroupPermissions.includes(
                                        permission.id
                                      );

                                    return (
                                      <Tooltip key={permission.id}>
                                        <TooltipTrigger asChild>
                                          <div className="flex flex-col gap-1 cursor-help">
                                            <div className="flex gap-2 items-center">
                                              <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={(checked) =>
                                                  setSelectedPermissions(
                                                    (prev) => {
                                                      if (checked) {
                                                        return [
                                                          ...prev,
                                                          permission.id,
                                                        ];
                                                      } else {
                                                        return prev.filter(
                                                          (id) =>
                                                            id !== permission.id
                                                        );
                                                      }
                                                    }
                                                  )
                                                }
                                              />
                                              <span className="text-sm font-medium text-gray-700">
                                                {permission.name}
                                                {isCurrent && (
                                                  <span className="ml-1 text-xs text-green-600">
                                                    (current)
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                            <div className="ml-6 text-xs text-gray-500">
                                              {permission.codename}
                                            </div>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="space-y-1">
                                            <div className="font-semibold">
                                              {permission.codename}
                                            </div>
                                            <div className="text-muted-foreground">
                                              {permission.name}
                                            </div>
                                            {isCurrent && (
                                              <div className="text-xs text-primary">
                                                Currently assigned
                                              </div>
                                            )}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            )
          )}
        </div>

        {!isLoadingGroupPermissions &&
          !isLoadingAllPermissions &&
          Object.keys(filteredGroupedPermissions).length === 0 && (
            <div className="py-16 text-center bg-white rounded-lg border border-gray-100">
              <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gray-50 rounded-full">
                <Shield className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                No permissions found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
      </div>
    </TooltipProvider>
  );

  // Render as standalone content or as dialog
  if (isStandalone) {
    return content;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50 border-gray-200">
        <DialogHeader className="pb-6">
          <div className="flex gap-3 items-center mb-2">
            <div className="flex justify-center items-center w-12 h-12 rounded-lg bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Permissions for{" "}
                {selectedGroup.is_position_group
                  ? selectedGroup.position_name
                  : selectedGroup.name}
              </DialogTitle>
              <DialogDescription className="mt-1 text-gray-500">
                Manage what this group can access and modify. Use filters to
                find specific permissions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsModal;
