"use client";

import { Shield, Plus, Trash2, Eye, ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { DataTable } from "@/components/datatable/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import DeleteGroupModal from "./components/DeleteGroupModal";
import GroupModal from "./components/GroupModal";
import PermissionsModal from "./components/PermissionsModal";
import { GroupsColumns } from "./columns";
import type { Group, CreateGroup } from "./schema";

import { useAtom } from "jotai";
import { pageIndexAtom, pageSizeAtom } from "@/store";

// Import API actions
import {
  getGroupsAction,
  createGroupAction,
  deleteGroupAction,
  updateGroupPermissionsAction,
} from "@/actions/users/perms";

const Roles = () => {
  const queryClient = useQueryClient();

  // View state: 'list' or 'permissions'
  const [currentView, setCurrentView] = useState<"list" | "permissions">(
    "list"
  );
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Pagination state using jotai atoms (like positions)
  const [pageIndex, setPageIndex] = useAtom(pageIndexAtom);
  const [pageSize, setPageSize] = useAtom(pageSizeAtom);

  // Search state
  const [search, setSearch] = useState("");

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  // React Query for groups
  const {
    data: groupsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await getGroupsAction();
      if (response.error) {
        throw new Error(response.message || "Failed to load groups");
      }
      return response.data?.results || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const groups = groupsData || [];

  // Filter groups based on search
  const filteredGroups = groups.filter(
    (group: Group) =>
      group.name.toLowerCase().includes(search.toLowerCase()) ||
      (group.position_name &&
        group.position_name.toLowerCase().includes(search.toLowerCase()))
  );

  const startIndex = pageIndex * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedGroups = filteredGroups.slice(startIndex, endIndex);

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: createGroupAction,
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.message || "Failed to create group");
      } else {
        toast.success("Group created successfully!");
        setIsAddModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      }
    },
    onError: () => {
      toast.error("An error occurred while creating the group");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroupAction,
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.message || "Failed to delete group");
      } else {
        toast.success("Group deleted successfully!");
        setIsDeleteModalOpen(false);
        setSelectedGroup(null);
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      }
    },
    onError: () => {
      toast.error("An error occurred while deleting the group");
    },
  });

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
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        queryClient.invalidateQueries({ queryKey: ["groupPermissions"] });
      }
    },
    onError: () => {
      toast.error("An error occurred while updating permissions");
    },
  });

  // Handlers
  const handleAddGroup = (data: CreateGroup) => {
    createGroupMutation.mutate(data);
  };

  const handleDeleteGroup = () => {
    if (!selectedGroup) return;
    deleteGroupMutation.mutate(selectedGroup.id);
  };

  const handlePermissionsUpdate = (
    groupId: number,
    permissionIds: number[]
  ) => {
    updatePermissionsMutation.mutate({ groupId, permissionIds });
  };

  const openPermissionsView = (group: Group) => {
    setSelectedGroup(group);
    setCurrentView("permissions");
  };

  const goBackToList = () => {
    setCurrentView("list");
    setSelectedGroup(null);
  };

  const openDeleteModal = (group: Group) => {
    setSelectedGroup(group);
    setIsDeleteModalOpen(true);
  };

  // Enhanced columns with proper action handlers
  const enhancedColumns = GroupsColumns.map((column) => {
    if (column.id === "actions") {
      return {
        ...column,
        cell: ({ row }: any) => {
          const group = row.original;
          return (
            <div className="flex gap-2 items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openPermissionsView(group)}
                className="p-0 w-8 h-8"
              >
                <Eye className="w-4 h-4" />
                <span className="sr-only">View permissions</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteModal(group)}
                className="p-0 w-8 h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Delete group</span>
              </Button>
            </div>
          );
        },
      };
    }
    return column;
  });

  // Table data for DataTable
  const dataForTable = {
    data: {
      count: filteredGroups.length,
      results: paginatedGroups,
    },
  };

  // Searchable columns
  const SEARCHABLE_COLUMN_IDS = ["name"] as const;
  const TABLEKEY = "groups" as const;

  // Render permissions view
  if (currentView === "permissions" && selectedGroup) {
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex gap-4 items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBackToList}
            className="flex gap-2 items-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Groups
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Permissions for {selectedGroup.name}
          </h1>
          <p className="text-muted-foreground">
            Manage permissions for the "{selectedGroup.name}" group. Users in
            this group will have access to the selected permissions.
          </p>
        </div>

        {/* Permissions content */}
        <PermissionsModal
          isOpen={true}
          onClose={goBackToList}
          selectedGroup={selectedGroup}
          onPermissionsUpdate={handlePermissionsUpdate}
          isLoading={updatePermissionsMutation.isPending}
          isStandalone={true}
        />
      </div>
    );
  }

  // Render groups list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground">
          Create and manage user groups and their permissions. Groups define
          what users can access and modify in the system.
        </p>
      </div>

      {/* DataTable */}
      <div className="w-full">
        <DataTable
          tableKey={TABLEKEY}
          data={dataForTable}
          columns={enhancedColumns}
          isLoading={isLoading}
          isError={isError}
          options={[]}
          errorMessage={error?.message || ""}
          searchableColumnIds={[...SEARCHABLE_COLUMN_IDS]}
          searchableColumnsSetters={[setSearch]}
          actionButton={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                className="flex gap-2 items-center h-10"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                className="flex gap-2 items-center h-10 text-white rounded-md transition-all duration-300 ease-in-out cursor-pointer bg-primary"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Group
              </Button>
            </div>
          }
        />
      </div>

      {/* Modals */}
      <GroupModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddGroup}
        isLoading={createGroupMutation.isPending}
      />

      <DeleteGroupModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedGroup(null);
        }}
        onConfirm={handleDeleteGroup}
        group={selectedGroup}
        isLoading={deleteGroupMutation.isPending}
      />
    </div>
  );
};

export default Roles;
