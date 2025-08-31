"use client";

import { Building2, Home, Layers3, Map, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import { getProjectOwnersWithFallback } from '@/actions/clients/ownerDashboardAction';
import { getProjectStructure } from '@/actions/projects/structure';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import AddOwner from './Components/owner/addOwner';
import { ProjectOwner } from './Components/schema/porjectOwnersReadSchema';
import { StructureNode } from './Components/schema/projectStructureSchema';
import DeletePropertyOwnershipModal from './Components/structure/DeletePropertyOwnershipModal';
import Header from './Components/structure/header';
import { PermissionGate } from '@/components/PermissionGate';

const ProjectOwners = ({ projectId }: { projectId: string }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddOwnerModalOpen, setIsAddOwnerModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<{
    id: string;
    name: string;
    node_type: string;
    owner_name: string;
    projectId: string;
  } | null>(null);
  const queryClient = useQueryClient();

  // Fetch project owners data using the new server action
  const {
    data: projectOwnersData,
    isLoading: projectOwnersLoading,
    error: projectOwnersError,
  } = useQuery({
    queryKey: ["project-owners", projectId],
    queryFn: () => getProjectOwnersWithFallback(projectId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!projectId,
  });

  // Fetch project structure data
  const { data: structureData, isLoading: structureLoading } = useQuery({
    queryKey: ["project-structure", projectId],
    queryFn: async (): Promise<StructureNode[]> => {
      const response = await getProjectStructure(projectId);
      if (response.error) {
        throw new Error("Failed to fetch structure");
      }
      return response.data.results as StructureNode[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!projectId,
  });

  // Extract project owners from API response
  const projectOwners: ProjectOwner[] =
    projectOwnersData?.data?.results?.[0]?.project_owners || [];

  // Extract structure nodes - properly typed
  const structureDataTyped = structureData as StructureNode[] | undefined;

  // Extract all owned properties from all owners
  const ownedProperties = projectOwners.flatMap((owner) =>
    owner.owned_properties.map((property) => ({
      id: property.id,
      name: property.name,
      node_type: property.node_type,
    }))
  );

  // Filter owners based on status
  const filteredOwners = projectOwners.filter((owner) => {
    const matchesStatus =
      statusFilter === "all" || owner.status === statusFilter;
    return matchesStatus;
  });

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case "BLOCK":
        return <Building2 className="w-4 h-4" />;
      case "HOUSE":
        return <Home className="w-4 h-4" />;
      case "UNIT":
        return <Layers3 className="w-4 h-4" />;
      case "FLOOR":
        return <Layers3 className="w-4 h-4" />;
      case "ROOM":
        return <Map className="w-4 h-4" />;
      default:
        return <Map className="w-4 h-4" />;
    }
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case "BLOCK":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "HOUSE":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "UNIT":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "FLOOR":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "ROOM":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const handleDeleteProperty = (
    property: {
      id: string;
      name: string;
      node_type: string;
    },
    ownerName: string
  ) => {
    setPropertyToDelete({
      id: property.id,
      name: property.name,
      node_type: property.node_type,
      owner_name: ownerName,
      projectId: projectId,
    });
    setDeleteDialogOpen(true);
  };

  if (projectOwnersLoading || structureLoading) {
    return (
      <div className="space-y-6">
        <Header
          title="Project Owners"
          description="View all property owners and their holdings"
        />

        <Card className="relative bg-transparent shadow-none !p-0 border-none overflow-hidden">
          <CardHeader>
            <div className="flex justify-end items-end">
              <div className="flex gap-3 items-center">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  disabled
                >
                  <SelectTrigger className="w-32 !h-11">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="h-11 bg-primary hover:bg-primary/90"
                  disabled
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Assign Owner
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="py-12 text-center">
              <div className="flex justify-center items-center mb-4">
                <div className="w-8 h-8 rounded-full border-2 animate-spin border-primary border-t-transparent"></div>
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                Loading Project Owners
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Please wait while we fetch the data...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projectOwnersError) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 w-12 h-12 text-red-500">
            <Users className="w-full h-full" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
            Failed to Load Data
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Unable to fetch project owners data. Please try again later.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="Project Owners"
        description="View all property owners and their holdings"
      />

      {/* Owners List */}
      <Card className="relative bg-transparent shadow-none !p-0 border-none overflow-hidden">
        <CardHeader>
          <div className="flex justify-end items-end">
            <div className="flex gap-3 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 !h-11">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <PermissionGate codename="add_owners" showFallback={false}>
                <Button
                  className="h-11 bg-primary hover:bg-primary/90"
                  onClick={async () => {
                    // Refetch structure data to get latest structure
                    await queryClient.refetchQueries({
                      queryKey: ["project-structure", projectId],
                    });
                    setIsAddOwnerModalOpen(true);
                  }}
                  disabled={structureLoading}
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Assign Owner
                </Button>
              </PermissionGate>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOwners.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                No Owners Found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No owners match your current filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {filteredOwners.map((owner) => (
                <Card
                  key={owner.id}
                  className="bg-transparent rounded-xl border shadow-none border-primary/20"
                >
                  <CardContent className="p-6">
                    {/* Owner Info */}
                    <div className="flex gap-4 items-center mb-6">
                      <div className="p-3 rounded-full bg-primary">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-1 text-xl font-bold text-gray-900">
                          {owner.name}
                        </h3>
                        <p className="text-sm text-gray-600">{owner.email}</p>
                        <p className="text-sm text-gray-600">{owner.phone}</p>
                      </div>
                      <Badge
                        className={
                          owner.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {owner.status}
                      </Badge>
                    </div>

                    {/* Properties List */}
                    <div>
                      <h4 className="mb-4 text-sm font-semibold text-gray-700">
                        Owned Properties ({owner.owned_properties.length})
                      </h4>
                      <div className="space-y-3">
                        {owner.owned_properties.map((property) => (
                          <div
                            key={property.id}
                            className="p-4 rounded-lg border bg-gray-50/50 border-primary/20"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex gap-3 items-center">
                                <div className="p-2 text-white rounded-lg bg-primary">
                                  {getNodeTypeIcon(property.node_type)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {property.name}
                                  </p>
                                  {property.parent_name && (
                                    <p className="text-xs text-gray-500">
                                      {property.parent_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 items-center">
                                <Badge
                                  className={getNodeTypeColor(
                                    property.node_type
                                  )}
                                >
                                  {property.node_type}
                                </Badge>
                                <PermissionGate codename="delete_owners" showFallback={false}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProperty(property, owner.name)}
                                    className="p-1 w-8 h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </PermissionGate>
                              </div>
                            </div>

                            {/* Contains Info */}
                            <div className="flex justify-between items-center text-xs text-gray-600">
                              <span>Contains:</span>
                              <div className="flex gap-4">
                                {property.node_type === "BLOCK" && (
                                  <>
                                    <span className="flex gap-1 items-center">
                                      <Layers3 className="w-3 h-3" />
                                      {property.nested_floors || 0} Floors
                                    </span>
                                    <span className="flex gap-1 items-center">
                                      <Layers3 className="w-3 h-3" />
                                      {property.nested_units || 0} Units
                                    </span>
                                  </>
                                )}
                                {property.node_type === "HOUSE" && (
                                  <>
                                    <span className="flex gap-1 items-center">
                                      <Layers3 className="w-3 h-3" />
                                      {property.nested_floors || 0} Floors
                                    </span>
                                    <span className="flex gap-1 items-center">
                                      <Map className="w-3 h-3" />
                                      {property.nested_rooms || 0} Rooms
                                    </span>
                                  </>
                                )}
                                {property.node_type === "UNIT" && (
                                  <span className="flex gap-1 items-center">
                                    <Map className="w-3 h-3" />
                                    {property.nested_rooms || 0} Rooms
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Owner Modal */}
      <AddOwner
        isOpen={isAddOwnerModalOpen}
        onClose={() => setIsAddOwnerModalOpen(false)}
        structure={(structureDataTyped || []) as any}
        projectId={projectId}
        ownedProperties={ownedProperties}
      />

      {/* Delete Property Ownership Modal */}
      <DeletePropertyOwnershipModal
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPropertyToDelete(null);
        }}
        property={propertyToDelete}
        onDeleted={() => {
          // Refetch data after deletion
          queryClient.refetchQueries({
            queryKey: ["project-owners", projectId],
          });
        }}
      />
    </div>
  );
};

export default ProjectOwners;
