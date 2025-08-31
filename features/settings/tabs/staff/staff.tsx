"use client";

import { useAtom } from 'jotai';
import {
    ArrowLeft, Building2, CheckSquare, ChevronDown, ChevronRight, Filter, Pencil, Plus, Search,
    Shield, Trash2, User, Users, X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
    createStaff, deleteStaff, fetchPositionsForDropdown, fetchStaffTable, getUserPermissions,
    updateStaff,
} from '@/actions/settings/staff';
import {
    assignUserRolesAction, getAllPermissionsAction, getGroupPermissionsAction, getGroupsAction,
} from '@/actions/users/perms';
import { DataTable } from '@/components/datatable/data-table';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { pageIndexAtom, pageSizeAtom } from '@/store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mockStaff, StaffColumns } from './columns';
import DeleteStaffModal from './components/DeleteStaffModal';
import DynamicUserModal from './components/DynamicUserModal';
import StaffModal from './components/StaffModal';

import type {
  StaffForm,
  StaffTableItem,
  PositionDropdown,
} from "../../schema/staff";

const Staff = () => {
  // Pagination state using jotai atoms (like positions)
  const [pageIndex, setPageIndex] = useAtom(pageIndexAtom);
  const [pageSize, setPageSize] = useAtom(pageSizeAtom);

  // Search state
  const [search, setSearch] = useState("");
  const [showDeleted] = useState(false); // not used, but available if needed

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffTableItem | null>(
    null
  );
  const [modalType, setModalType] = useState<"groups" | "permissions">(
    "permissions"
  );

  // Role assignment state
  const [currentView, setCurrentView] = useState<"list" | "roleAssignment">(
    "list"
  );
  const [selectedStaffForRole, setSelectedStaffForRole] =
    useState<StaffTableItem | null>(null);
  const [assignmentType, setAssignmentType] = useState<{
    groups: boolean;
    direct: boolean;
  }>({ groups: false, direct: false });
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<"groups" | "individual">(
    "groups"
  );
  const [openApp, setOpenApp] = useState<string | null>(null);

  // Filter states for individual permissions (like PermissionsModal.tsx)
  const [filter, setFilter] = useState<{ category?: string; model?: string }>(
    {}
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showCheckedOnly, setShowCheckedOnly] = useState(false);
  const [showUncheckedOnly, setShowUncheckedOnly] = useState(false);

  // Track user's current roles (what they already have)
  const [userCurrentGroups, setUserCurrentGroups] = useState<Set<number>>(
    new Set()
  );
  const [userCurrentPermissions, setUserCurrentPermissions] = useState<
    Set<number>
  >(new Set());

  // Track what the user has actually changed (for proper diff calculation)
  const [originalGroups, setOriginalGroups] = useState<Set<number>>(new Set());
  const [originalPermissions, setOriginalPermissions] = useState<Set<number>>(
    new Set()
  );

  const queryClient = useQueryClient();

  // Fetch positions for dropdown
  const {
    data: positionsData,
    isLoading: isPositionsLoading,
    error: positionsError,
  } = useQuery({
    queryKey: ["positions-dropdown"],
    queryFn: fetchPositionsForDropdown,
  });

  // Fetch staff with pagination and search
  const {
    data: tableDataRaw,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["staff", { pageIndex, pageSize, search, showDeleted }],
    queryFn: () =>
      fetchStaffTable({
        page: pageIndex + 1, // Convert to 1-based for backend
        pageSize,
        search,
        showDeleted,
      }),
  });

  // Provide fallback for tableData
  const tableData = tableDataRaw || { count: 0, results: [] };
  const positions = positionsData?.results || [];

  // Fetch groups for role assignment
  const {
    data: groupsData,
    isLoading: isGroupsLoading,
    error: groupsError,
  } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await getGroupsAction();
      if (response.error) {
        throw new Error(response.message || "Failed to load groups");
      }
      return response.data?.results || [];
    },
    enabled: currentView === "roleAssignment",
  });

  // Fetch all permissions for role assignment
  const {
    data: permissionsData,
    isLoading: isPermissionsLoading,
    error: permissionsError,
  } = useQuery({
    queryKey: ["allPermissions"],
    queryFn: async () => {
      const response = await getAllPermissionsAction();
      if (response.error) {
        throw new Error(response.message || "Failed to load permissions");
      }
      return response.data?.results || [];
    },
    enabled: currentView === "roleAssignment",
  });

  // Fetch user's current permissions when entering role assignment
  const { data: userPermissionsData, isLoading: isLoadingUserPermissions } =
    useQuery({
      queryKey: ["user-permissions", selectedStaffForRole?.id],
      queryFn: async () => {
        if (!selectedStaffForRole?.id) return null;
        const response = await getUserPermissions(selectedStaffForRole.id);
        if (response.error) {
          throw new Error(
            response.message || "Failed to load user permissions"
          );
        }
        return response.data;
      },
      enabled: currentView === "roleAssignment" && !!selectedStaffForRole?.id,
    });

  const groups = groupsData || [];
  const permissions = permissionsData || [];

  // Flatten permissions from the grouped structure
  const flattenedPermissions = useMemo(() => {
    if (!permissions || !Array.isArray(permissions)) return [];

    return permissions.flatMap((category: any) => {
      return category.permissions || [];
    });
  }, [permissions]);

  // Fetch permissions for selected groups
  const {
    data: selectedGroupsPermissionsData,
    isLoading: isLoadingSelectedGroupsPermissions,
  } = useQuery({
    queryKey: ["selectedGroupsPermissions", selectedGroups],
    queryFn: async () => {
      if (selectedGroups.length === 0) return [];

      const promises = selectedGroups.map(async (groupId) => {
        const response = await getGroupPermissionsAction(groupId);
        if (response.error) {
          console.error(
            `Failed to load permissions for group ${groupId}:`,
            response.message
          );
          return [];
        }
        return response.data?.permissions || [];
      });

      const results = await Promise.all(promises);
      return results.flat();
    },
    enabled: selectedGroups.length > 0,
  });

  // Get permissions from selected groups to exclude them from direct selection
  const selectedGroupPermissions = useMemo(() => {
    const selectedGroupPermissions = new Set<number>();
    if (selectedGroupsPermissionsData) {
      selectedGroupsPermissionsData.forEach((perm: any) => {
        if (perm.is_checked) {
          selectedGroupPermissions.add(perm.id);
        }
      });
    }
    return selectedGroupPermissions;
  }, [selectedGroupsPermissionsData]);

  // Remove individual permissions that are now covered by selected groups
  React.useEffect(() => {
    const groupPermissionIds = Array.from(selectedGroupPermissions);
    setSelectedPermissions((prev) =>
      prev.filter((id) => !groupPermissionIds.includes(id))
    );
  }, [selectedGroups, selectedGroupPermissions]);

  // Initialize user's current roles when data loads
  React.useEffect(() => {
    if (userPermissionsData) {
      // Set current groups
      const currentGroups = new Set<number>(
        userPermissionsData.groups.map((group: any) => group.id)
      );
      setUserCurrentGroups(currentGroups);
      setOriginalGroups(new Set(currentGroups)); // Store original state
      setSelectedGroups(Array.from(currentGroups));

      // Set current permissions (from all_permissions)
      const currentPermissions = new Set<number>();
      (userPermissionsData.all_permissions || []).forEach((category: any) => {
        (category.permissions || []).forEach((permission: any) => {
          currentPermissions.add(permission.id);
        });
      });
      setUserCurrentPermissions(currentPermissions);
      setOriginalPermissions(new Set(currentPermissions)); // Store original state
      setSelectedPermissions(Array.from(currentPermissions));
    }
  }, [userPermissionsData]);

  // Helper functions from PermissionsModal
  const toggleAppCollapse = (appLabel: string) => {
    setOpenApp((prev) => (prev === appLabel ? null : appLabel));
  };

  // Group permissions by custom categories (same logic as PermissionsModal.tsx)
  const groupedPermissions = useMemo(() => {
    if (!permissions || !Array.isArray(permissions)) return {};

    const grouped: Record<string, Record<string, any[]>> = {};

    // Flatten all permissions from all categories
    const allPermissions = permissions.flatMap(
      (cat: any) => cat.permissions || []
    );

    // Group permissions by custom categories extracted from codenames
    allPermissions.forEach((permission: any) => {
      const codename = permission.codename;
      let categoryName = "Other";
      let modelName = "Other";

      // Extract category and model from codename (same logic as PermissionsModal.tsx)
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

    return grouped;
  }, [permissions]);

  // Apply filters to grouped permissions (same logic as PermissionsModal.tsx)
  const filteredGroupedPermissions = useMemo(() => {
    if (!groupedPermissions || Object.keys(groupedPermissions).length === 0)
      return {};

    let filtered = { ...groupedPermissions };

    // Filter by category
    if (filter.category && filter.category !== "all") {
      filtered = Object.keys(filtered).reduce((acc, category) => {
        if (category === filter.category) {
          acc[category] = filtered[category];
        }
        return acc;
      }, {} as Record<string, Record<string, any[]>>);
    }

    // Filter by model (backend model names) - same as PermissionsModal.tsx
    if (filter.model && filter.model !== "all") {
      filtered = Object.keys(filtered).reduce((acc, category) => {
        const categoryModels = filtered[category];
        const filteredModels: Record<string, any[]> = {};

        // Filter permissions by backend model name
        Object.keys(categoryModels).forEach((modelKey) => {
          const permissions = categoryModels[modelKey];
          const filteredPermissions = permissions.filter((permission: any) => {
            if (permission.content_type && permission.content_type.model) {
              const backendModelName =
                permission.content_type.model.charAt(0).toUpperCase() +
                permission.content_type.model.slice(1);
              return backendModelName === filter.model;
            }
            return false;
          });

          if (filteredPermissions.length > 0) {
            filteredModels[modelKey] = filteredPermissions;
          }
        });

        if (Object.keys(filteredModels).length > 0) {
          acc[category] = filteredModels;
        }
        return acc;
      }, {} as Record<string, Record<string, any[]>>);
    }

    // Filter by search term
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

    // Filter by checked/unchecked status
    if (showCheckedOnly) {
      filtered = Object.keys(filtered).reduce((acc, category) => {
        const categoryModels = filtered[category];
        const filteredModels: Record<string, any[]> = {};

        Object.keys(categoryModels).forEach((model) => {
          const permissions = categoryModels[model].filter((perm: any) =>
            originalPermissions.has(perm.id)
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

    if (showUncheckedOnly) {
      filtered = Object.keys(filtered).reduce((acc, category) => {
        const categoryModels = filtered[category];
        const filteredModels: Record<string, any[]> = {};

        Object.keys(categoryModels).forEach((model) => {
          const permissions = categoryModels[model].filter(
            (perm: any) => !originalPermissions.has(perm.id)
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
    filter.category,
    filter.model,
    searchTerm,
    showCheckedOnly,
    showUncheckedOnly,
    originalPermissions,
  ]);

  // Get available categories and models for filters
  const availableCategories = useMemo(() => {
    return Object.keys(groupedPermissions).map((category) => ({
      value: category,
      label: category,
    }));
  }, [groupedPermissions]);

  // Get available models from backend data (actual Django models) - same as PermissionsModal.tsx
  const availableModels = useMemo(() => {
    if (!permissions || !Array.isArray(permissions)) return [];

    const backendModels = new Set<string>();

    // Extract actual model names from backend permissions
    permissions.forEach((category: any) => {
      if (category.permissions && Array.isArray(category.permissions)) {
        category.permissions.forEach((permission: any) => {
          // Get the actual model name from the permission's content_type
          if (permission.content_type && permission.content_type.model) {
            const modelName =
              permission.content_type.model.charAt(0).toUpperCase() +
              permission.content_type.model.slice(1);
            backendModels.add(modelName);
          }
        });
      }
    });

    const models = Array.from(backendModels).map((model) => ({
      value: model,
      label: model,
    }));

    return models;
  }, [permissions]);

  // Extract action type from codename
  const getActionType = (codename: string) => {
    if (codename.includes("add_")) return "add";
    if (codename.includes("change_")) return "change";
    if (codename.includes("delete_")) return "delete";
    if (codename.includes("view_")) return "view";
    return "other";
  };

  // Get the main permission for each action type
  const getMainPermissionForAction = (
    permissions: any[],
    actionType: string
  ) => {
    const actionPermissions = permissions.filter(
      (p: any) => getActionType(p.codename) === actionType
    );

    // Prioritize generic permissions (Create, Update, Delete, View) for cleaner UI
    const genericPermission = actionPermissions.find((p: any) => {
      const codename = p.codename.toLowerCase();
      return ["create", "update", "delete", "view"].includes(codename);
    });

    if (genericPermission) {
      return genericPermission;
    }

    // Fall back to specific permissions if no generic ones found
    return actionPermissions[0] || null;
  };

  // Handle model toggle (all actions for a model)
  const handleModelToggle = (
    appLabel: string,
    model: string,
    checked: boolean
  ) => {
    const permissions = groupedPermissions[appLabel]?.[model] || [];

    setSelectedPermissions((prev) => {
      if (checked) {
        const newPermissions = [...prev];
        permissions.forEach((permission: any) => {
          // Only add if not already covered by a selected group
          if (
            !newPermissions.includes(permission.id) &&
            !selectedGroupPermissions.has(permission.id)
          ) {
            newPermissions.push(permission.id);
          }
        });
        return newPermissions;
      } else {
        const permissionIds = permissions.map((p: any) => p.id);
        return prev.filter((id) => !permissionIds.includes(id));
      }
    });
  };

  // Check if model is fully selected
  const isModelFullySelected = (appLabel: string, model: string) => {
    const permissions = groupedPermissions[appLabel]?.[model] || [];
    const permissionIds = permissions.map((p: any) => p.id);
    return permissionIds.every((id) => selectedPermissions.includes(id));
  };

  // Check if model is partially selected
  const isModelPartiallySelected = (appLabel: string, model: string) => {
    const permissions = groupedPermissions[appLabel]?.[model] || [];
    const permissionIds = permissions.map((p: any) => p.id);
    const selectedCount = permissionIds.filter((id) =>
      selectedPermissions.includes(id)
    ).length;
    return selectedCount > 0 && selectedCount < permissionIds.length;
  };

  // Check if app is fully selected
  const isAppFullySelected = (appLabel: string) => {
    const models = groupedPermissions[appLabel] || {};
    return Object.keys(models).every((model) =>
      isModelFullySelected(appLabel, model)
    );
  };

  // Check if all permissions are selected (global select all)
  const isAllPermissionsSelected = () => {
    const allFilteredPermissions = Object.values(filteredGroupedPermissions)
      .flatMap((models) => Object.values(models))
      .flat();
    const allPermissionIds = allFilteredPermissions.map((p: any) => p.id);
    return (
      allPermissionIds.length > 0 &&
      allPermissionIds.every((id: number) => selectedPermissions.includes(id))
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
          // Only add if not already covered by a selected group
          if (
            !newPermissions.includes(id) &&
            !selectedGroupPermissions.has(id)
          ) {
            newPermissions.push(id);
          }
        });
        return newPermissions;
      } else {
        return prev.filter((id: number) => !allPermissionIds.includes(id));
      }
    });
  };

  // Check if app is partially selected
  const isAppPartiallySelected = (appLabel: string) => {
    const models = groupedPermissions[appLabel] || {};
    const modelKeys = Object.keys(models);
    const fullySelectedCount = modelKeys.filter((model) =>
      isModelFullySelected(appLabel, model)
    ).length;
    const partiallySelectedCount = modelKeys.filter((model) =>
      isModelPartiallySelected(appLabel, model)
    ).length;
    return (
      (fullySelectedCount > 0 || partiallySelectedCount > 0) &&
      fullySelectedCount < modelKeys.length
    );
  };

  // Handle app toggle (all models in an app)
  const handleAppToggle = (appLabel: string, checked: boolean) => {
    const models = groupedPermissions[appLabel] || {};
    const allPermissionIds: number[] = [];

    Object.keys(models).forEach((model) => {
      const permissions = models[model] || [];
      const permissionIds = permissions.map((p: any) => p.id);
      allPermissionIds.push(...permissionIds);
    });

    setSelectedPermissions((prev) => {
      if (checked) {
        const newPermissions = [...prev];
        allPermissionIds.forEach((id) => {
          // Only add if not already covered by a selected group
          if (
            !newPermissions.includes(id) &&
            !selectedGroupPermissions.has(id)
          ) {
            newPermissions.push(id);
          }
        });
        return newPermissions;
      } else {
        return prev.filter((id) => !allPermissionIds.includes(id));
      }
    });
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: StaffForm) => {
      return await createStaff(data);
    },
    onSuccess: (data) => {
      if (data && data.error) {
        toast.error(data.message || "Failed to create staff member");
        return;
      }
      refetch();
      setIsAddModalOpen(false);
      toast.success("Staff member created successfully!");
    },
    onError: () => {
      toast.error("Failed to create staff member");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: StaffForm }) => {
      return await updateStaff(id, values);
    },
    onSuccess: (data) => {
      if (data && data.error) {
        toast.error(data.message || "Failed to update staff member");
        return;
      }
      refetch();
      setIsEditModalOpen(false);
      setSelectedStaff(null);
      toast.success("Staff member updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update staff member");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteStaff(id);
    },
    onSuccess: (data) => {
      if (data && data.error) {
        toast.error(data.message || "Failed to delete staff member");
        return;
      }
      refetch();
      setIsDeleteModalOpen(false);
      setSelectedStaff(null);
      toast.success("Staff member deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete staff member");
    },
  });

  // Role assignment mutation
  const assignRolesMutation = useMutation({
    mutationFn: ({
      userId,
      groupsToAdd,
      groupsToRemove,
      permissionsToAdd,
      permissionsToRemove,
    }: {
      userId: string;
      groupsToAdd: number[];
      groupsToRemove: number[];
      permissionsToAdd: number[];
      permissionsToRemove: number[];
    }) =>
      assignUserRolesAction(
        userId,
        groupsToAdd,
        groupsToRemove,
        permissionsToAdd,
        permissionsToRemove
      ),
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.message || "Failed to assign roles");
      } else {
        toast.success(
          response.message || "Role assignment submitted successfully!"
        );
        // Refetch the staff table to update group/permission counts
        refetch();
        goBackToList();
      }
    },
    onError: (error: any) => {
      toast.error("An unexpected error occurred while assigning roles");
    },
  });

  // Handlers
  const handleAddStaff = (data: StaffForm) => {
    createMutation.mutate(data);
  };

  const handleEditStaff = (data: StaffForm) => {
    if (!selectedStaff) return;
    updateMutation.mutate({ id: selectedStaff.id, values: data });
  };

  const handleDeleteStaff = () => {
    if (!selectedStaff) return;
    deleteMutation.mutate(selectedStaff.id);
  };

  const openEditModal = (staff: StaffTableItem) => {
    setSelectedStaff(staff);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (staff: StaffTableItem) => {
    setSelectedStaff(staff);
    setIsDeleteModalOpen(true);
  };

  const openPermissionsModal = (staff: StaffTableItem) => {
    setSelectedStaff(staff);
    setModalType("permissions");
    setIsPermissionsModalOpen(true);
  };

  const openGroupsModal = (staff: StaffTableItem) => {
    setSelectedStaff(staff);
    setModalType("groups");
    setIsPermissionsModalOpen(true);
  };

  const openRoleAssignment = (staff: StaffTableItem) => {
    setSelectedStaffForRole(staff);
    setCurrentView("roleAssignment");
  };

  const goBackToList = () => {
    setCurrentView("list");
    setSelectedStaffForRole(null);
    setAssignmentType({ groups: false, direct: false });
    setSelectedGroups([]);
    setSelectedPermissions([]);
    setOriginalGroups(new Set());
    setOriginalPermissions(new Set());
    setUserCurrentGroups(new Set());
    setUserCurrentPermissions(new Set());
  };

  const handleAssignmentTypeChange = (
    type: "groups" | "direct",
    checked: boolean
  ) => {
    setAssignmentType((prev) => ({
      ...prev,
      [type]: checked,
    }));
  };

  const handleSubmitRoleAssignment = () => {
    if (!selectedStaffForRole) return;

    // Calculate changes by comparing current selection with original state
    // This ensures we only send what actually changed, not what the user currently has
    const groupsToAdd = selectedGroups.filter((id) => !originalGroups.has(id));
    const groupsToRemove = Array.from(originalGroups).filter(
      (id) => !selectedGroups.includes(id)
    );

    const permissionsToAdd = selectedPermissions.filter(
      (id) => !originalPermissions.has(id)
    );
    const permissionsToRemove = Array.from(originalPermissions).filter(
      (id) => !selectedPermissions.includes(id)
    );

    // Check if there are any changes
    const hasChanges =
      groupsToAdd.length > 0 ||
      groupsToRemove.length > 0 ||
      permissionsToAdd.length > 0 ||
      permissionsToRemove.length > 0;

    if (!hasChanges) {
      toast.error("No changes detected");
      return;
    }

    // Log changes for debugging
    console.log("Role Assignment Changes:", {
      originalGroups: Array.from(originalGroups),
      originalPermissions: Array.from(originalPermissions),
      selectedGroups,
      selectedPermissions,
      groupsToAdd,
      groupsToRemove,
      permissionsToAdd,
      permissionsToRemove,
    });

    // Use mutation to assign roles with changes
    assignRolesMutation.mutate({
      userId: selectedStaffForRole.id,
      groupsToAdd,
      groupsToRemove,
      permissionsToAdd,
      permissionsToRemove,
    });
  };

  // Enhanced columns with proper action handlers
  const enhancedColumns = StaffColumns.map((column) => {
    if (column.id === "actions") {
      return {
        ...column,
        cell: ({ row }: any) => {
          const staff = row.original;
          return (
            <div className="flex items-center gap-2">
              <PermissionGate codename="manage_roles" showFallback={false}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openRoleAssignment(staff)}
                  className="p-0 w-8 h-8"
                >
                  <Shield className="w-4 h-4" />
                  <span className="sr-only">Assign role</span>
                </Button>
              </PermissionGate>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditModal(staff)}
                className="p-0 w-8 h-8"
              >
                <Pencil className="w-4 h-4" />
                <span className="sr-only">Edit staff</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteModal(staff)}
                className="p-0 w-8 h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Delete staff</span>
              </Button>
            </div>
          );
        },
      };
    }
    if (
      column.id === "group_count" ||
      (column as any).accessorKey === "group_count"
    ) {
      return {
        ...column,
        cell: ({ row }: any) => {
          const staff = row.original;
          const groupCount = staff.group_count;

          return (
            <button
              onClick={() => openGroupsModal(staff)}
              disabled={groupCount === 0}
              className={`flex gap-2 items-center transition-colors ${
                groupCount > 0
                  ? "hover:text-blue-600 cursor-pointer"
                  : "cursor-default"
              }`}
            >
              <Users className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-gray-900">{groupCount}</span>
            </button>
          );
        },
      };
    }
    if (
      column.id === "permission_count" ||
      (column as any).accessorKey === "permission_count"
    ) {
      return {
        ...column,
        cell: ({ row }: any) => {
          const staff = row.original;
          const permissionCount = staff.permission_count;

          return (
            <button
              onClick={() => openPermissionsModal(staff)}
              disabled={permissionCount === 0}
              className={`flex gap-2 items-center transition-colors ${
                permissionCount > 0
                  ? "hover:text-green-600 cursor-pointer"
                  : "cursor-default"
              }`}
            >
              <Shield className="w-4 h-4 text-green-500" />
              <span className="font-medium text-gray-900">
                {permissionCount}
              </span>
            </button>
          );
        },
      };
    }
    return column;
  });

  // Table data for DataTable
  const dataForTable = {
    data: {
      count: tableData.count,
      results: tableData.results,
    },
  };

  // Searchable columns
  const SEARCHABLE_COLUMN_IDS = [
    "first_name",
    "last_name",
    "email",
    "position.name",
  ] as const;
  const TABLEKEY = "staff" as const;

  // Render role assignment view
  if (currentView === "roleAssignment" && selectedStaffForRole) {
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBackToList}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Staff
          </Button>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-2">
            <h1 className="font-bold text-3xl tracking-tight">
              Assign Role to {selectedStaffForRole.first_name}{" "}
              {selectedStaffForRole.last_name}
            </h1>
            <p className="text-muted-foreground">
              Select groups and permissions to assign to this staff member.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowReview(!showReview)}
            >
              {showReview ? "Close Review" : "Open Review"}
            </Button>
            <Button
              onClick={handleSubmitRoleAssignment}
              disabled={
                (selectedGroups.length === 0 &&
                  selectedPermissions.length === 0 &&
                  Array.from(originalGroups).filter(
                    (id) => !selectedGroups.includes(id)
                  ).length === 0 &&
                  Array.from(originalPermissions).filter(
                    (id) => !selectedPermissions.includes(id)
                  ).length === 0) ||
                assignRolesMutation.isPending
              }
              className="bg-primary hover:bg-primary/90"
            >
              {assignRolesMutation.isPending ? (
                <>
                  <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin"></div>
                  Assigning...
                </>
              ) : (
                `Save Changes`
              )}
            </Button>
          </div>
        </div>

        {/* Mode Toggle */}
        {!showReview && (
          <div className="flex justify-start">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setAssignmentMode("groups")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  assignmentMode === "groups"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Group-based Assignment
              </button>
              <button
                onClick={() => setAssignmentMode("individual")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  assignmentMode === "individual"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Individual Permissions
              </button>
            </div>
          </div>
        )}

        {/* Review Card - Full Width */}
        {showReview && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>What Will Be Assigned</CardTitle>
              <p className="text-muted-foreground text-sm">
                Review your selections before assigning
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Groups */}
              {selectedGroups.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 mb-3 font-medium text-sm">
                    <Users className="w-4 h-4" />
                    Groups ({selectedGroups.length})
                  </h4>
                  <div className="space-y-2">
                    {groups
                      .filter((group: any) => selectedGroups.includes(group.id))
                      .map((group: any) => {
                        const isNew = !originalGroups.has(group.id);
                        const isCurrent = originalGroups.has(group.id);

                        return (
                          <div
                            key={group.id}
                            className={`flex justify-between items-center p-3 rounded-lg border ${
                              isNew
                                ? "bg-blue-50 border-blue-200"
                                : "bg-green-50 border-green-200"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`font-medium ${
                                    isNew ? "text-blue-900" : "text-green-900"
                                  }`}
                                >
                                  {group.name}
                                </div>
                                {isNew && (
                                  <div className="bg-blue-100 px-2 py-1 rounded text-blue-700 text-xs">
                                    New
                                  </div>
                                )}
                                {isCurrent && (
                                  <div className="bg-green-100 px-2 py-1 rounded text-green-700 text-xs">
                                    Current
                                  </div>
                                )}
                              </div>
                              <div
                                className={`text-sm ${
                                  isNew ? "text-blue-600" : "text-green-600"
                                }`}
                              >
                                {group.permission_count} permissions included
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSelectedGroups((prev) =>
                                  prev.filter((id) => id !== group.id)
                                )
                              }
                              className={`${
                                isNew
                                  ? "text-blue-600 hover:text-blue-800"
                                  : "text-green-600 hover:text-green-800"
                              }`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Groups to be Removed */}
              {Array.from(originalGroups).filter(
                (id) => !selectedGroups.includes(id)
              ).length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 mb-3 font-medium text-red-700 text-sm">
                    <Users className="w-4 h-4" />
                    Groups to Remove (
                    {
                      Array.from(originalGroups).filter(
                        (id) => !selectedGroups.includes(id)
                      ).length
                    }
                    )
                  </h4>
                  <div className="space-y-2">
                    {groups
                      .filter(
                        (group: any) =>
                          originalGroups.has(group.id) &&
                          !selectedGroups.includes(group.id)
                      )
                      .map((group: any) => (
                        <div
                          key={group.id}
                          className="flex justify-between items-center bg-red-50 p-3 border border-red-200 rounded-lg"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-red-900">
                                {group.name}
                              </div>
                              <div className="bg-red-100 px-2 py-1 rounded text-red-700 text-xs">
                                Will Remove
                              </div>
                            </div>
                            <div className="text-red-600 text-sm">
                              {group.permission_count} permissions will be
                              removed
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setSelectedGroups((prev) => [...prev, group.id])
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Selected Individual Permissions */}
              {selectedPermissions.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 mb-3 font-medium text-sm">
                    <Shield className="w-4 h-4" />
                    Individual Permissions ({selectedPermissions.length})
                  </h4>
                  <div className="space-y-4">
                    {(() => {
                      // Group selected permissions by app and model
                      const groupedSelectedPermissions: Record<
                        string,
                        Record<string, any[]>
                      > = {};

                      flattenedPermissions
                        .filter((perm: any) =>
                          selectedPermissions.includes(perm.id)
                        )
                        .forEach((perm: any) => {
                          const appLabel = perm.content_type?.app_label;
                          const model = perm.content_type?.model;

                          if (!groupedSelectedPermissions[appLabel]) {
                            groupedSelectedPermissions[appLabel] = {};
                          }
                          if (!groupedSelectedPermissions[appLabel][model]) {
                            groupedSelectedPermissions[appLabel][model] = [];
                          }

                          groupedSelectedPermissions[appLabel][model].push(
                            perm
                          );
                        });

                      return Object.entries(groupedSelectedPermissions).map(
                        ([appLabel, models]) => (
                          <div key={appLabel} className="space-y-3">
                            <h5 className="font-medium text-gray-700 text-sm capitalize">
                              {appLabel}
                            </h5>
                            <div className="gap-4 grid grid-cols-3">
                              {Object.entries(models).map(
                                ([model, permissions]) => {
                                  // Get shortcut names for actions
                                  const getShortcutName = (permission: any) => {
                                    const codename =
                                      permission.codename.toLowerCase();
                                    if (codename === "create") return "Create";
                                    if (codename === "update") return "Update";
                                    if (codename === "delete") return "Delete";
                                    if (codename === "view") return "View";
                                    // For specific permissions, extract action from codename
                                    if (codename.includes("add_")) return "Add";
                                    if (codename.includes("change_"))
                                      return "Change";
                                    if (codename.includes("delete_"))
                                      return "Delete";
                                    if (codename.includes("view_"))
                                      return "View";
                                    return permission.name;
                                  };

                                  const actionNames =
                                    permissions.map(getShortcutName);

                                  return (
                                    <div
                                      key={model}
                                      className="bg-blue-50 p-3 border border-blue-200 rounded-lg"
                                    >
                                      {/* Row 1: Model Name */}
                                      <div className="mb-2 font-medium text-blue-900 text-sm capitalize">
                                        {model}
                                      </div>
                                      {/* Row 2: Action Badges with Cancel Buttons */}
                                      <div className="flex flex-wrap gap-1">
                                        {permissions.map((perm: any) => {
                                          const actionName =
                                            getShortcutName(perm);
                                          const isNew =
                                            !originalPermissions.has(perm.id);
                                          const isCurrent =
                                            originalPermissions.has(perm.id);

                                          return (
                                            <div
                                              key={perm.id}
                                              className="flex items-center gap-1"
                                            >
                                              <span
                                                className={`px-2 py-1 text-xs font-medium rounded ${
                                                  isNew
                                                    ? "text-blue-800 bg-blue-100"
                                                    : "text-green-800 bg-green-100"
                                                }`}
                                              >
                                                {actionName}
                                                {isNew && (
                                                  <span className="ml-1">
                                                    (new)
                                                  </span>
                                                )}
                                                {isCurrent && (
                                                  <span className="ml-1">
                                                    (current)
                                                  </span>
                                                )}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  setSelectedPermissions(
                                                    (prev) =>
                                                      prev.filter(
                                                        (id) => id !== perm.id
                                                      )
                                                  )
                                                }
                                                className={`p-0 w-4 h-4 ${
                                                  isNew
                                                    ? "text-blue-600 hover:text-blue-800"
                                                    : "text-green-600 hover:text-green-800"
                                                }`}
                                              >
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        )
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Permissions to be Removed */}
              {Array.from(originalPermissions).filter(
                (id) => !selectedPermissions.includes(id)
              ).length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 mb-3 font-medium text-red-700 text-sm">
                    <Shield className="w-4 h-4" />
                    Individual Permissions to Remove (
                    {
                      Array.from(originalPermissions).filter(
                        (id) => !selectedPermissions.includes(id)
                      ).length
                    }
                    )
                  </h4>
                  <div className="space-y-4">
                    {(() => {
                      // Group permissions to be removed by app and model
                      const groupedRemovedPermissions: Record<
                        string,
                        Record<string, any[]>
                      > = {};

                      flattenedPermissions
                        .filter(
                          (perm: any) =>
                            originalPermissions.has(perm.id) &&
                            !selectedPermissions.includes(perm.id)
                        )
                        .forEach((perm: any) => {
                          const appLabel = perm.content_type?.app_label;
                          const model = perm.content_type?.model;

                          if (!groupedRemovedPermissions[appLabel]) {
                            groupedRemovedPermissions[appLabel] = {};
                          }
                          if (!groupedRemovedPermissions[appLabel][model]) {
                            groupedRemovedPermissions[appLabel][model] = [];
                          }

                          groupedRemovedPermissions[appLabel][model].push(perm);
                        });

                      return Object.entries(groupedRemovedPermissions).map(
                        ([appLabel, models]) => (
                          <div key={appLabel} className="space-y-3">
                            <h5 className="font-medium text-red-700 text-sm capitalize">
                              {appLabel}
                            </h5>
                            <div className="gap-4 grid grid-cols-3">
                              {Object.entries(models).map(
                                ([model, permissions]) => {
                                  const getShortcutName = (permission: any) => {
                                    const codename =
                                      permission.codename.toLowerCase();
                                    if (codename === "create") return "Create";
                                    if (codename === "update") return "Update";
                                    if (codename === "delete") return "Delete";
                                    if (codename === "view") return "View";
                                    if (codename.includes("add_")) return "Add";
                                    if (codename.includes("change_"))
                                      return "Change";
                                    if (codename.includes("delete_"))
                                      return "Delete";
                                    if (codename.includes("view_"))
                                      return "View";
                                    return permission.name;
                                  };

                                  return (
                                    <div
                                      key={model}
                                      className="bg-red-50 p-3 border border-red-200 rounded-lg"
                                    >
                                      <div className="mb-2 font-medium text-red-900 text-sm capitalize">
                                        {model}
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {permissions.map((perm: any) => {
                                          const actionName =
                                            getShortcutName(perm);
                                          return (
                                            <div
                                              key={perm.id}
                                              className="flex items-center gap-1"
                                            >
                                              <span className="bg-red-100 px-2 py-1 rounded font-medium text-red-800 text-xs">
                                                {actionName} (will remove)
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  setSelectedPermissions(
                                                    (prev) => [...prev, perm.id]
                                                  )
                                                }
                                                className="p-0 w-4 h-4 text-red-600 hover:text-red-800"
                                              >
                                                <svg
                                                  className="w-3 h-3"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                                  />
                                                </svg>
                                              </Button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        )
                      );
                    })()}
                  </div>
                </div>
              )}

              {selectedGroups.length === 0 &&
                selectedPermissions.length === 0 &&
                Array.from(originalGroups).filter(
                  (id) => !selectedGroups.includes(id)
                ).length === 0 &&
                Array.from(originalPermissions).filter(
                  (id) => !selectedPermissions.includes(id)
                ).length === 0 && (
                  <div className="py-12 text-gray-500 text-center">
                    <Shield className="mx-auto mb-3 w-12 h-12 text-gray-300" />
                    <p className="font-medium">No selections yet</p>
                    <p className="text-sm">
                      Choose groups or permissions from below
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Assignment Content - Full Width */}
        <div className="w-full">
          {!showReview &&
            (assignmentMode === "groups" ? (
              /* Group-based Assignment */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Select Groups
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Choose groups to assign (includes all their permissions)
                  </p>
                </CardHeader>
                <CardContent>
                  {isGroupsLoading || isLoadingUserPermissions ? (
                    <div className="bg-white py-16 border border-gray-100 rounded-lg text-center">
                      <div className="mx-auto mb-4 border-2 border-gray-200 border-t-primary rounded-full w-10 h-10 animate-spin"></div>
                      <p className="font-medium text-gray-600">
                        Loading groups...
                      </p>
                      <p className="mt-1 text-gray-500 text-sm">
                        Please wait while we fetch the latest data
                      </p>
                    </div>
                  ) : groupsError ? (
                    <div className="bg-white py-16 border border-gray-100 rounded-lg text-center">
                      <div className="flex justify-center items-center bg-red-50 mx-auto mb-4 rounded-full w-16 h-16">
                        <Users className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                        Error loading groups
                      </h3>
                      <p className="text-gray-500">
                        Failed to load groups. Please try again.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Groups Grid */}
                      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {groups
                          .filter((group: any) => group.permission_count > 0)
                          .map((group: any) => (
                            <div
                              key={group.id}
                              className={`relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                selectedGroups.includes(group.id)
                                  ? "bg-blue-50 border-blue-200 shadow-sm"
                                  : "bg-white border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-start space-x-4">
                                <Checkbox
                                  checked={selectedGroups.includes(group.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedGroups((prev) => [
                                        ...prev,
                                        group.id,
                                      ]);
                                    } else {
                                      setSelectedGroups((prev) =>
                                        prev.filter((id) => id !== group.id)
                                      );
                                    }
                                  }}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="font-medium text-gray-900 truncate">
                                      {group.name}
                                    </div>
                                    {originalGroups.has(group.id) &&
                                      selectedGroups.includes(group.id) && (
                                        <div className="bg-green-100 px-2 py-1 rounded text-green-700 text-xs">
                                          Current
                                        </div>
                                      )}
                                    {selectedGroups.includes(group.id) &&
                                      !originalGroups.has(group.id) && (
                                        <div className="bg-blue-100 px-2 py-1 rounded text-blue-700 text-xs">
                                          New
                                        </div>
                                      )}
                                    {originalGroups.has(group.id) &&
                                      !selectedGroups.includes(group.id) && (
                                        <div className="bg-red-100 px-2 py-1 rounded text-red-700 text-xs">
                                          Will Remove
                                        </div>
                                      )}
                                  </div>
                                  <div className="mb-2 text-gray-500 text-sm">
                                    {group.permission_count} permissions
                                  </div>
                                  {group.position_name && (
                                    <div className="bg-gray-100 px-2 py-1 rounded text-gray-400 text-xs">
                                      Position: {group.position_name}
                                    </div>
                                  )}
                                  {group.description && (
                                    <div className="mt-2 text-gray-600 text-xs line-clamp-2">
                                      {group.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Selection indicator */}
                              {selectedGroups.includes(group.id) && (
                                <div className="top-2 right-2 absolute">
                                  <div className="flex justify-center items-center bg-blue-500 rounded-full w-6 h-6">
                                    <svg
                                      className="w-4 h-4 text-white"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>

                      {/* Empty state */}
                      {groups.filter((group: any) => group.permission_count > 0)
                        .length === 0 && (
                        <div className="bg-white py-16 border border-gray-100 rounded-lg text-center">
                          <div className="flex justify-center items-center bg-gray-50 mx-auto mb-4 rounded-full w-16 h-16">
                            <Users className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                            No groups available
                          </h3>
                          <p className="text-gray-500">
                            No groups with permissions are available for
                            assignment
                          </p>
                        </div>
                      )}

                      {/* Hidden groups info */}
                      {groups.filter(
                        (group: any) => group.permission_count === 0
                      ).length > 0 && (
                        <div className="bg-yellow-50 p-3 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800 text-sm">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {
                              groups.filter(
                                (group: any) => group.permission_count === 0
                              ).length
                            }{" "}
                            groups with no permissions are hidden
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Individual Permissions Assignment */
              <TooltipProvider>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Select Individual Permissions
                    </CardTitle>
                    <p className="text-muted-foreground text-sm">
                      Choose specific permissions to assign directly
                    </p>
                  </CardHeader>
                  <CardContent>
                    {isPermissionsLoading || isLoadingUserPermissions ? (
                      <div className="bg-white py-16 border border-gray-100 rounded-lg text-center">
                        <div className="mx-auto mb-4 border-2 border-gray-200 border-t-primary rounded-full w-10 h-10 animate-spin"></div>
                        <p className="font-medium text-gray-600">
                          Loading permissions...
                        </p>
                        <p className="mt-1 text-gray-500 text-sm">
                          Please wait while we fetch the latest data
                        </p>
                      </div>
                    ) : permissionsError ? (
                      <div className="py-4 text-red-600 text-center">
                        Error loading permissions
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Filters Section */}
                        <div className="bg-white p-6 border border-gray-100 rounded-lg">
                          <div className="flex justify-between items-center gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex justify-center items-center bg-primary/10 rounded-lg w-10 h-10">
                                <Filter className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">
                                  Filters & Search
                                </h3>
                                <p className="text-gray-500 text-sm">
                                  Find and filter permissions
                                  {(filter.category &&
                                    filter.category !== "all") ||
                                  (filter.model && filter.model !== "all") ||
                                  searchTerm ||
                                  showCheckedOnly ||
                                  showUncheckedOnly ? (
                                    <span className="inline-flex items-center bg-primary/10 ml-2 px-2 py-1 rounded-full font-medium text-primary text-xs">
                                      Active
                                    </span>
                                  ) : null}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {(filter.category && filter.category !== "all") ||
                              (filter.model && filter.model !== "all") ||
                              searchTerm ||
                              showCheckedOnly ||
                              showUncheckedOnly ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setFilter({});
                                    setSearchTerm("");
                                    setShowCheckedOnly(false);
                                    setShowUncheckedOnly(false);
                                  }}
                                  className="hover:bg-gray-50 border-gray-200 text-gray-600"
                                >
                                  <X className="mr-2 w-4 h-4" />
                                  Clear Filters
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex justify-between items-center gap-4">
                            {/* Search on the left */}
                            <div className="relative flex-1 max-w-md">
                              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                              <Input
                                placeholder={`Search permissions... (${selectedPermissions.length} selected)`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-gray-50 focus:bg-white pl-10 border-gray-200"
                              />
                            </div>

                            {/* Filters on the right */}
                            <div className="flex items-center gap-3">
                              {/* Model Filter */}
                              <Select
                                value={filter.model || "all"}
                                onValueChange={(value) =>
                                  setFilter((prev) => ({
                                    ...prev,
                                    model: value === "all" ? undefined : value,
                                  }))
                                }
                              >
                                <SelectTrigger className="bg-gray-50 focus:bg-white border-gray-200 w-48">
                                  <Building2 className="mr-2 w-4 h-4" />
                                  <SelectValue placeholder="All Models" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">
                                    All Models
                                  </SelectItem>
                                  {(availableModels || []).map((model: any) => (
                                    <SelectItem
                                      key={model.value}
                                      value={model.value}
                                    >
                                      {model.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Category Filter */}
                              <Select
                                value={filter.category || "all"}
                                onValueChange={(value) =>
                                  setFilter((prev) => ({
                                    ...prev,
                                    category:
                                      value === "all" ? undefined : value,
                                  }))
                                }
                              >
                                <SelectTrigger className="bg-gray-50 focus:bg-white border-gray-200 w-48">
                                  <Filter className="mr-2 w-4 h-4" />
                                  <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">
                                    All Categories
                                  </SelectItem>
                                  {(availableCategories || []).map(
                                    (category: any) => (
                                      <SelectItem
                                        key={category.value}
                                        value={category.value}
                                      >
                                        {category.label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>

                              {/* Status Filter */}
                              <Select
                                value={
                                  showCheckedOnly
                                    ? "checked"
                                    : showUncheckedOnly
                                    ? "unchecked"
                                    : "all"
                                }
                                onValueChange={(value) => {
                                  setShowCheckedOnly(value === "checked");
                                  setShowUncheckedOnly(value === "unchecked");
                                }}
                              >
                                <SelectTrigger className="bg-gray-50 focus:bg-white border-gray-200 w-40">
                                  <CheckSquare className="mr-2 w-4 h-4" />
                                  <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">
                                    All Status
                                  </SelectItem>
                                  <SelectItem value="checked">
                                    Checked Only
                                  </SelectItem>
                                  <SelectItem value="unchecked">
                                    Unchecked Only
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Global Select All */}
                        {Object.keys(filteredGroupedPermissions).length > 0 && (
                          <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 border border-primary/20 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="flex justify-center items-center bg-primary/20 rounded-lg w-10 h-10">
                                  <CheckSquare className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900 text-lg">
                                    Select All Permissions
                                  </h3>
                                  <p className="text-gray-600 text-sm">
                                    Select or deselect all permissions across
                                    all categories
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isAllPermissionsSelected()}
                                  ref={(el) => {
                                    if (el) {
                                      (el as any).indeterminate =
                                        isSomePermissionsSelected();
                                    }
                                  }}
                                  onCheckedChange={(checked) =>
                                    handleGlobalSelectAll(checked as boolean)
                                  }
                                  className="w-5 h-5"
                                />
                                <span className="font-medium text-gray-700 text-sm">
                                  Select All
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Permissions List */}
                        {Object.entries(filteredGroupedPermissions).map(
                          ([category, models]) => (
                            <div
                              key={category}
                              className="bg-white border border-gray-100 rounded-lg overflow-hidden"
                            >
                              {/* Category Header */}
                              <div className="p-4 border-gray-100 border-b">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() =>
                                        toggleAppCollapse(category)
                                      }
                                      className="hover:bg-gray-50 p-2 rounded-lg transition-all duration-200"
                                    >
                                      {openApp === category ? (
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                      )}
                                    </button>
                                    <div className="flex items-center gap-3">
                                      <div className="flex justify-center items-center bg-primary/10 rounded-lg w-8 h-8">
                                        <Shield className="w-4 h-4 text-primary" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-900 text-base">
                                          {category}
                                        </h3>
                                        <p className="text-gray-500 text-sm">
                                          {Object.values(models).flat().length}{" "}
                                          permissions
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Category Select All */}
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={isAppFullySelected(category)}
                                      ref={(el) => {
                                        if (el) {
                                          (el as any).indeterminate =
                                            isAppPartiallySelected(category);
                                        }
                                      }}
                                      onCheckedChange={(checked) =>
                                        handleAppToggle(
                                          category,
                                          checked as boolean
                                        )
                                      }
                                    />
                                    <span className="text-gray-600 text-sm">
                                      Select All
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Models List */}
                              {openApp === category && (
                                <div className="p-4">
                                  <div className="space-y-3">
                                    {Object.entries(models).map(
                                      ([model, permissions]) => {
                                        const modelName =
                                          model.charAt(0).toUpperCase() +
                                          model.slice(1);

                                        return (
                                          <div key={model}>
                                            {/* Model Row */}
                                            <div className="flex justify-between items-center bg-gray-50 hover:bg-white hover:shadow-sm p-4 border border-gray-200 rounded-lg transition-colors">
                                              {/* Model Name and Select All */}
                                              <div className="flex items-center gap-3 min-w-[150px]">
                                                <Checkbox
                                                  checked={isModelFullySelected(
                                                    category,
                                                    model
                                                  )}
                                                  ref={(el) => {
                                                    if (el) {
                                                      (
                                                        el as any
                                                      ).indeterminate =
                                                        isModelPartiallySelected(
                                                          category,
                                                          model
                                                        );
                                                    }
                                                  }}
                                                  onCheckedChange={(checked) =>
                                                    handleModelToggle(
                                                      category,
                                                      model,
                                                      checked as boolean
                                                    )
                                                  }
                                                />
                                                <span className="font-medium text-gray-900">
                                                  {modelName}
                                                </span>
                                              </div>

                                              {/* Individual Permission Checkboxes */}
                                              <div className="flex flex-wrap items-start gap-4">
                                                {permissions.map(
                                                  (permission: any) => {
                                                    const isChecked =
                                                      selectedPermissions.includes(
                                                        permission.id
                                                      );
                                                    const isCurrent =
                                                      originalPermissions.has(
                                                        permission.id
                                                      );

                                                    return (
                                                      <Tooltip
                                                        key={permission.id}
                                                      >
                                                        <TooltipTrigger asChild>
                                                          <div className="flex flex-col gap-1 cursor-help">
                                                            <div className="flex items-center gap-2">
                                                              <Checkbox
                                                                checked={
                                                                  isChecked
                                                                }
                                                                disabled={selectedGroupPermissions.has(
                                                                  permission.id
                                                                )}
                                                                onCheckedChange={(
                                                                  checked
                                                                ) =>
                                                                  setSelectedPermissions(
                                                                    (prev) => {
                                                                      if (
                                                                        checked
                                                                      ) {
                                                                        return [
                                                                          ...prev,
                                                                          permission.id,
                                                                        ];
                                                                      } else {
                                                                        return prev.filter(
                                                                          (
                                                                            id
                                                                          ) =>
                                                                            id !==
                                                                            permission.id
                                                                        );
                                                                      }
                                                                    }
                                                                  )
                                                                }
                                                              />
                                                              <span
                                                                className={`text-sm font-medium ${
                                                                  selectedGroupPermissions.has(
                                                                    permission.id
                                                                  )
                                                                    ? "text-gray-400"
                                                                    : "text-gray-700"
                                                                }`}
                                                              >
                                                                {
                                                                  permission.name
                                                                }
                                                                {selectedGroupPermissions.has(
                                                                  permission.id
                                                                ) && (
                                                                  <span className="ml-1 text-gray-400 text-xs">
                                                                    (via group)
                                                                  </span>
                                                                )}
                                                                {isCurrent && (
                                                                  <span className="ml-1 text-green-600 text-xs">
                                                                    (current)
                                                                  </span>
                                                                )}
                                                              </span>
                                                            </div>
                                                            <div className="ml-6 text-gray-500 text-xs">
                                                              {
                                                                permission.codename
                                                              }
                                                            </div>
                                                          </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <div className="space-y-1">
                                                            <div className="font-semibold">
                                                              {
                                                                permission.codename
                                                              }
                                                            </div>
                                                            <div className="text-muted-foreground">
                                                              {permission.name}
                                                            </div>
                                                            {isCurrent && (
                                                              <div className="text-primary text-xs">
                                                                Currently
                                                                assigned
                                                              </div>
                                                            )}
                                                          </div>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    );
                                                  }
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        )}

                        {/* Empty state when no permissions found after filtering */}
                        {Object.keys(filteredGroupedPermissions).length ===
                          0 && (
                          <div className="bg-white py-16 border border-gray-100 rounded-lg text-center">
                            <div className="flex justify-center items-center bg-gray-50 mx-auto mb-4 rounded-full w-16 h-16">
                              <Shield className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                              No permissions found
                            </h3>
                            <p className="text-gray-500">
                              Try adjusting your search or filter criteria
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {!isPermissionsLoading &&
                      Object.keys(groupedPermissions).length === 0 && (
                        <div className="bg-white py-16 border border-gray-100 rounded-lg text-center">
                          <div className="flex justify-center items-center bg-gray-50 mx-auto mb-4 rounded-full w-16 h-16">
                            <Shield className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                            No permissions found
                          </h3>
                          <p className="text-gray-500">
                            No permissions are available
                          </p>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </TooltipProvider>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-3xl tracking-tight">Staff Management</h1>
        <p className="text-muted-foreground">
          Create and manage staff members within your organization. Assign
          positions and manage access to the system.
        </p>
      </div>

      {/* DataTable */}
      <div className="w-full">
        <DataTable
          tableKey={TABLEKEY}
          data={dataForTable}
          columns={enhancedColumns}
          isLoading={isLoading}
          isError={!!error}
          options={[]}
          errorMessage={error ? (error as any).message : ""}
          searchableColumnIds={[...SEARCHABLE_COLUMN_IDS]}
          searchableColumnsSetters={[setSearch]}
          actionButton={
            <Button
              className="flex items-center gap-2 bg-primary rounded-md h-10 text-white transition-all duration-300 ease-in-out cursor-pointer"
              onClick={() => setIsAddModalOpen(true)}
              disabled={isPositionsLoading || !!positionsError}
            >
              <Plus className="w-4 h-4" />
              Add Staff Member
            </Button>
          }
        />
      </div>

      {/* Modals */}
      <StaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddStaff}
        positions={positions}
        isLoading={createMutation.status === "pending"}
      />

      <StaffModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStaff(null);
        }}
        onSubmit={handleEditStaff}
        staff={selectedStaff}
        positions={positions}
        isLoading={updateMutation.status === "pending"}
      />

      <DeleteStaffModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedStaff(null);
        }}
        onConfirm={handleDeleteStaff}
        staff={selectedStaff}
        isLoading={deleteMutation.status === "pending"}
      />

      <DynamicUserModal
        isOpen={isPermissionsModalOpen}
        onClose={() => {
          setIsPermissionsModalOpen(false);
          setSelectedStaff(null);
        }}
        userId={selectedStaff?.id || ""}
        userName={
          selectedStaff
            ? `${selectedStaff.first_name} ${selectedStaff.last_name}`
            : ""
        }
        modalType={modalType}
      />
    </div>
  );
};

export default Staff;
