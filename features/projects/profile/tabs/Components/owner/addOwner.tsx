"use client";

import {
    ArrowLeft, ArrowRight, Building2, Check, ChevronRight, Home, Layers3, Loader2, Map, Search,
    Trash2, Users, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { assignOwnerToProperties } from '@/actions/clients/ownerDashboardAction';
import { searchOwnerAPI } from '@/actions/projects/tenantAssignment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TenantUser } from '@/features/property/tenant-assignment/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
    OwnerAssignmentFormData, OwnerAssignmentSchema, PropertySelection,
} from '../schema/ownerAssignmentSchema';

interface AddOwnerProps {
  isOpen: boolean;
  onClose: () => void;
  structure?: StructureNode[];
  projectId?: string;
  ownedProperties?: Array<{
    id: string;
    name: string;
    node_type: string;
  }>;
}

interface StructureNode {
  id: string;
  name: string;
  node_type: "BLOCK" | "HOUSE" | "FLOOR" | "UNIT" | "ROOM";
  parent?: string;
  children?: StructureNode[];
}

type Stage = "owner" | "property";
type PropertyView = "blocks" | "units" | "search" | "floors";

const findUnitHierarchy = (unitId: string, structure: StructureNode[]) => {
  let blockName = "";
  let floorName = "";
  for (const block of structure) {
    if (block.node_type === "BLOCK" || block.node_type === "HOUSE") {
      for (const floor of block.children || []) {
        if (floor.node_type === "FLOOR") {
          for (const unit of floor.children || []) {
            if (unit.id === unitId) {
              blockName = block.name;
              floorName = floor.name;
              return { blockName, floorName };
            }
          }
        }
      }
    }
  }
  return { blockName, floorName };
};

const AddOwner = ({
  isOpen,
  onClose,
  structure = [],
  projectId,
  ownedProperties = [],
}: AddOwnerProps) => {
  const [currentStage, setCurrentStage] = useState<Stage>("owner");
  const [ownerSearchTerm, setOwnerSearchTerm] = useState("");
  const [propertySearchTerm, setPropertySearchTerm] = useState("");
  const [propertyView, setPropertyView] = useState<PropertyView>("blocks");
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>("all");
  const [selectedProperties, setSelectedProperties] = useState<
    PropertySelection[]
  >([]);

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Owner assignment mutation
  const assignOwnerMutation = useMutation({
    mutationFn: async (data: {
      structuredData: {
        owner_id: string;
        properties?: Array<
          | {
              house_id: string;
              type: "HOUSE";
            }
          | {
              unit_id: string;
              type: "UNIT";
            }
        >;
        houses?: Array<{
          house_id: string;
          type: "HOUSE";
        }>;
      };
      projectId: string;
    }) => {
      const response = await assignOwnerToProperties(
        data.structuredData,
        data.projectId
      );
      if (!response.success) {
        throw new Error(
          response.message ||
            response.error ||
            "Failed to assign owner to properties"
        );
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch project owners data
      queryClient.invalidateQueries({
        queryKey: ["project-owners", projectId],
      });
      toast.success("Owner assigned to properties successfully");
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign owner to properties");
    },
  });

  // Owner search state
  const [owners, setOwners] = useState<TenantUser[]>([]);
  const [isLoadingOwners, setIsLoadingOwners] = useState(false);
  const [ownerSearchError, setOwnerSearchError] = useState<string | null>(null);

  // Form setup with React Hook Form and Zod validation
  const form = useForm<OwnerAssignmentFormData>({
    resolver: zodResolver(OwnerAssignmentSchema),
    defaultValues: {
      ownerId: "",
      properties: [],
      projectId: undefined,
    },
  });

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const selectedOwner = watch("ownerId");

  // Owner search function
  const searchOwners = async (query: string) => {
    if (!query.trim()) {
      setOwners([]);
      return;
    }
    setIsLoadingOwners(true);
    setOwnerSearchError(null);
    try {
      const response = await searchOwnerAPI(query, "owner");
      
      if (response.error) {
        setOwnerSearchError("Failed to search owners");
        setOwners([]);
      } else if (response.data && Array.isArray(response.data.results)) {
        setOwners(response.data.results);
      } else {
        setOwnerSearchError("Unexpected response format from server");
        setOwners([]);
        
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to search owners";
      setOwnerSearchError(errorMessage);
      setOwners([]);
      
    } finally {
      setIsLoadingOwners(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchOwners(ownerSearchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [ownerSearchTerm]);

  // Filter out owned properties from structure
  const filterOwnedProperties = (nodes: StructureNode[]): StructureNode[] => {
    const ownedPropertyIds = new Set(ownedProperties.map((p) => p.id));

    return nodes
      .map((node) => {
        // If this node is owned, exclude it
        if (ownedPropertyIds.has(node.id)) {
          return null;
        }

        // Recursively filter children
        if (node.children) {
          const filteredChildren = filterOwnedProperties(node.children);
          return {
            ...node,
            children: filteredChildren.filter((child) => child !== null),
          };
        }

        return node;
      })
      .filter((node) => node !== null) as StructureNode[];
  };

  // Get filtered structure (without owned properties)
  const filteredStructure = filterOwnedProperties(structure);

  // Get all units for search view (from filtered structure)
  const getAllUnits = (): StructureNode[] => {
    const units: StructureNode[] = [];
    const extractUnits = (nodes: StructureNode[]) => {
      nodes.forEach((node) => {
        if (node.node_type === "UNIT") {
          units.push(node);
        }
        if (node.children) {
          extractUnits(node.children);
        }
      });
    };
    extractUnits(filteredStructure || []);
    return units;
  };

  const allUnits = getAllUnits();
  const filteredUnits = allUnits.filter((unit) => {
    const matchesSearch = unit.name
      .toLowerCase()
      .includes(propertySearchTerm.toLowerCase());
    const matchesType =
      propertyTypeFilter === "all" || unit.node_type === propertyTypeFilter;
    return matchesSearch && matchesType;
  });

  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case "BLOCK":
        return <Building2 className="w-4 h-4" />;
      case "HOUSE":
        return <Home className="w-4 h-4" />;
      case "FLOOR":
        return <Layers3 className="w-4 h-4" />;
      case "UNIT":
        return <Layers3 className="w-4 h-4" />;
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
      case "FLOOR":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "UNIT":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const handleNextStage = () => {
    if (currentStage === "owner" && selectedOwner) {
      setCurrentStage("property");
    }
  };

  // Form submission handler
  const onSubmit = async (data: OwnerAssignmentFormData) => {
    try {
      // Organize properties by type and structure
      const houses = data.properties.filter((p) => p.type === "HOUSE");
      const units = data.properties.filter((p) => p.type === "UNIT");

      // Create structured data for backend based on property types
      let structuredData;

      if (houses.length > 0 && units.length === 0) {
        // Only houses selected
        structuredData = {
          owner_id: data.ownerId,
          properties: houses.map((house) => ({
            house_id: house.id, // This is the location node ID
            type: "HOUSE" as const,
          })),
        };
      } else if (units.length > 0 && houses.length === 0) {
        // Only units selected
        structuredData = {
          owner_id: data.ownerId,
          properties: units.map((unit) => ({
            unit_id: unit.id, // This is the location node ID
            type: "UNIT" as const,
          })),
        };
      } else {
        // Mixed selection - separate houses and units
        structuredData = {
          owner_id: data.ownerId,
          houses: houses.map((house) => ({
            house_id: house.id, // This is the location node ID
            type: "HOUSE" as const,
          })),
        };
      }

      
      // Use mutation to assign owner to properties
      assignOwnerMutation.mutate({
        structuredData,
        projectId: projectId || "",
      });
    } catch (error) {
      
      toast.error("Failed to process owner assignment");
    }
  };

  const handleClose = () => {
    setCurrentStage("owner");
    setValue("ownerId", "");
    setOwnerSearchTerm("");
    setPropertySearchTerm("");
    setPropertyView("blocks");
    setSelectedBlock("");
    setSelectedFloor("");
    setPropertyTypeFilter("all");
    setSelectedProperties([]);
    setOwners([]);
    setOwnerSearchError(null);
    setIsLoadingOwners(false);
    form.reset();
    onClose();
  };

  const handleCancel = () => {
    handleClose();
  };

  const handleBack = () => {
    if (currentStage === "property") {
      setCurrentStage("owner");
    }
  };

  const getSelectedOwnerName = () => {
    return (
      owners.find((o) => o.id === selectedOwner)?.first_name +
        " " +
        (owners.find((o) => o.id === selectedOwner)?.last_name || "") || ""
    );
  };

  const getSelectedBlock = () => {
    return (filteredStructure || []).find(
      (block) => block.id === selectedBlock
    );
  };

  const getSelectedFloor = () => {
    const block = getSelectedBlock();
    return block?.children?.find((floor) => floor.id === selectedFloor);
  };

  const getBlockStats = (block: StructureNode) => {
    const floors =
      block.children?.filter((child) => child.node_type === "FLOOR") || [];
    const totalUnits = floors.reduce((total, floor) => {
      return (
        total +
        (floor.children?.filter((unit) => unit.node_type === "UNIT").length ||
          0)
      );
    }, 0);

    return {
      floors: floors.length,
      units: totalUnits,
    };
  };

  const handlePropertySelection = (
    property: StructureNode,
    parentBlock?: string
  ) => {
    if (property.node_type !== "UNIT" && property.node_type !== "HOUSE") {
      // Do nothing for floors or other types
      return;
    }
    const existingIndex = selectedProperties.findIndex(
      (p) => p.id === property.id
    );
    if (existingIndex >= 0) {
      // Remove if already selected
      setSelectedProperties((prev) =>
        prev.filter((_, index) => index !== existingIndex)
      );
    } else {
      // Add new selection
      const newProperty: PropertySelection = {
        id: property.id,
        name: property.name,
        type: property.node_type as "UNIT" | "HOUSE",
        parentBlock,
        status: "pending",
      };
      setSelectedProperties((prev) => [...prev, newProperty]);
    }
  };

  const isPropertySelected = (propertyId: string) => {
    return selectedProperties.some((p) => p.id === propertyId);
  };

  const removeSelectedProperty = (propertyId: string) => {
    setSelectedProperties((prev) => prev.filter((p) => p.id !== propertyId));
  };

  // Update form values when selections change
  useEffect(() => {
    setValue("ownerId", selectedOwner);
  }, [selectedOwner, setValue]);

  useEffect(() => {
    setValue("properties", selectedProperties);
  }, [selectedProperties, setValue]);

  const renderPropertySelection = () => {
    if (propertyView === "search") {
      return (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPropertyView("blocks")}
              className="flex gap-2 items-center h-11 text-white bg-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blocks
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
              <Input
                placeholder="Search units by name..."
                value={propertySearchTerm}
                onChange={(e) => setPropertySearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={propertyTypeFilter}
              onValueChange={setPropertyTypeFilter}
            >
              <SelectTrigger className="w-32 !h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                <SelectItem value="UNIT">Units Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-y-auto space-y-2 max-h-60">
            {filteredUnits.map((unit) => (
              <div
                key={unit.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePropertySelection(unit);
                }}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-all cursor-pointer hover:shadow-md ${
                  isPropertySelected(unit.id)
                    ? "bg-green-50 border-green-300 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex gap-2 items-center">
                  {getNodeTypeIcon(unit.node_type)}
                  {unit.node_type === "UNIT" ? (
                    <div className="flex flex-col">
                      <span className="font-medium">{unit.name}</span>
                      <span className="text-xs text-gray-500">Unit</span>
                    </div>
                  ) : (
                    <span className="font-medium">{unit.name}</span>
                  )}
                  <Badge className={getNodeTypeColor(unit.node_type)}>
                    {unit.node_type}
                  </Badge>
                </div>
                {isPropertySelected(unit.id) && (
                  <Check className="ml-auto w-4 h-4 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (propertyView === "floors" && selectedBlock) {
      const block = getSelectedBlock();
      return (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPropertyView("blocks")}
              className="flex gap-2 items-center h-11 text-white bg-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blocks
            </Button>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{block?.name}</h3>
              <p className="text-sm text-gray-500">
                Select a floor to view its units
              </p>
            </div>
          </div>

          <div className="overflow-y-auto space-y-2 max-h-60">
            {block?.children?.map((floor) => (
              <div
                key={floor.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedFloor(floor.id);
                  setPropertyView("units");
                }}
                className="flex gap-3 items-center p-3 rounded-lg border border-gray-200 transition-all cursor-pointer hover:shadow-md hover:border-gray-300"
              >
                <div className="flex gap-2 items-center">
                  {getNodeTypeIcon(floor.node_type)}
                  <div className="flex flex-col">
                    <span className="font-medium">{floor.name}</span>
                  </div>
                  <Badge className={getNodeTypeColor(floor.node_type)}>
                    {floor.node_type}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {floor.children?.filter((unit) => unit.node_type === "UNIT")
                      .length || 0}{" "}
                    units
                  </span>
                </div>
                <ChevronRight className="ml-auto w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (propertyView === "units" && (selectedBlock || selectedFloor)) {
      const block = getSelectedBlock();
      const floor = getSelectedFloor();
      const units = floor?.children || block?.children || [];

      return (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (selectedFloor) {
                  setPropertyView("floors");
                  setSelectedFloor("");
                } else {
                  setPropertyView("blocks");
                  setSelectedBlock("");
                }
              }}
              className="flex gap-2 items-center h-11 text-white bg-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                {floor ? `${block?.name} - ${floor.name}` : block?.name}
              </h3>
              <p className="text-sm text-gray-500">
                {units.length} units available
              </p>
            </div>
          </div>

          <div className="overflow-y-auto space-y-2 max-h-60">
            {units.map((unit) => (
              <div
                key={unit.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePropertySelection(unit, block?.id);
                }}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-all cursor-pointer hover:shadow-md ${
                  isPropertySelected(unit.id)
                    ? "bg-green-50 border-green-300 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex gap-2 items-center">
                  {getNodeTypeIcon(unit.node_type)}
                  {unit.node_type === "UNIT" ? (
                    <div className="flex flex-col">
                      <span className="font-medium">{unit.name}</span>
                      <span className="text-xs text-gray-500">Unit</span>
                    </div>
                  ) : (
                    <span className="font-medium">{unit.name}</span>
                  )}
                  <Badge className={getNodeTypeColor(unit.node_type)}>
                    {unit.node_type}
                  </Badge>
                </div>
                {isPropertySelected(unit.id) && (
                  <Check className="ml-auto w-4 h-4 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Default blocks view
    return (
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
            <Input
              placeholder="Search blocks..."
              value={propertySearchTerm}
              onChange={(e) => setPropertySearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setPropertyView("search")}
            className="flex gap-2 items-center h-11 text-white bg-primary"
          >
            <Search className="w-4 h-4" />
            Search All Units
          </Button>
        </div>

        <div className="overflow-y-auto space-y-3 max-h-60">
          {(filteredStructure || [])
            .filter((block) =>
              block.name
                .toLowerCase()
                .includes(propertySearchTerm.toLowerCase())
            )
            .map((block) => (
              <div
                key={block.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (block.node_type === "HOUSE") {
                    // For houses, select the house directly
                    handlePropertySelection(block);
                  } else {
                    // For blocks, always go to floors view
                    setSelectedBlock(block.id);
                    setPropertyView("floors");
                  }
                }}
                className={`flex items-center gap-3 hover:shadow-md p-4 border rounded-lg transition-all cursor-pointer ${
                  block.node_type === "HOUSE" && isPropertySelected(block.id)
                    ? "bg-green-50 border-green-300 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex flex-1 gap-3 items-center">
                  {getNodeTypeIcon(block.node_type)}
                  <div>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {block.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {block.node_type === "HOUSE"
                        ? "Complete house"
                        : (() => {
                            const stats = getBlockStats(block);
                            return `${stats.floors} floors • ${stats.units} units`;
                          })()}
                    </p>
                  </div>
                  <Badge className={getNodeTypeColor(block.node_type)}>
                    {block.node_type}
                  </Badge>
                </div>
                {block.node_type === "HOUSE" ? (
                  isPropertySelected(block.id) ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="text-xs text-gray-500">Click to select</div>
                  )
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center text-xl font-bold">
            {currentStage === "owner" ? (
              <>
                <Users className="w-5 h-5" />
                Select Owner
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5" />
                Select Properties
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {currentStage === "owner"
              ? "Choose an owner to assign to properties"
              : `Assigning ${getSelectedOwnerName()} to properties`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex justify-center items-center mb-6">
          <div className="flex gap-2 items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStage === "owner"
                  ? "bg-primary text-white"
                  : "bg-green-500 text-white"
              }`}
            >
              {currentStage === "owner" ? "1" : <Check className="w-4 h-4" />}
            </div>
            <div className="w-8 h-1 bg-gray-300"></div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStage === "property"
                  ? "bg-primary text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              2
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="py-4 space-y-6">
          {currentStage === "owner" ? (
            // Stage 1: Owner Selection
            <div className="space-y-4">
              <div>
                <Label className="block mb-2 text-sm font-medium">
                  Search Owners
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={ownerSearchTerm}
                    onChange={(e) => setOwnerSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.ownerId && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.ownerId.message}
                  </p>
                )}
              </div>
              <div className="overflow-y-auto space-y-2 max-h-60">
                {isLoadingOwners ? (
                  <div className="flex justify-center items-center py-8 text-gray-500">
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" /> Loading
                    owners...
                  </div>
                ) : ownerSearchError ? (
                  <div className="py-8 text-center text-red-500">
                    {ownerSearchError}
                  </div>
                ) : owners.length === 0 && ownerSearchTerm ? (
                  <div className="py-8 text-center text-gray-500">
                    No owners found.
                  </div>
                ) : (
                  owners.map((owner) => (
                    <div
                      key={owner.id}
                      onClick={() => setValue("ownerId", owner.id)}
                      className={`flex justify-between items-center p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md ${
                        selectedOwner === owner.id
                          ? "bg-blue-50 border-blue-300 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {owner.first_name} {owner.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{owner.email}</p>
                        <p className="text-sm text-gray-500">{owner.phone}</p>
                      </div>
                      {selectedOwner === owner.id && (
                        <div className="flex justify-center items-center w-6 h-6 bg-blue-600 rounded-full">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            // Stage 2: Property Selection
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Selected Owner:</span>{" "}
                  {getSelectedOwnerName()}
                </p>
              </div>

              <div>
                <Label className="block mb-2 text-sm font-medium">
                  Select Properties
                </Label>
                {renderPropertySelection()}
                {errors.properties && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.properties.message}
                  </p>
                )}
              </div>

              {/* Selected Properties Summary */}
              {selectedProperties.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900">
                      Selected Properties ({selectedProperties.length})
                    </h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProperties([])}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </Button>
                  </div>

                  <div className="overflow-y-auto space-y-2 max-h-40">
                    {selectedProperties.map((property) => (
                      <div
                        key={property.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex gap-2 items-center">
                          {getNodeTypeIcon(property.type)}
                          {property.type === "UNIT" ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {property.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {
                                  findUnitHierarchy(
                                    property.id,
                                    filteredStructure
                                  ).blockName
                                }{" "}
                                /{" "}
                                {
                                  findUnitHierarchy(
                                    property.id,
                                    filteredStructure
                                  ).floorName
                                }
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-medium">
                              {property.name}
                            </span>
                          )}
                          <Badge
                            className={`text-xs ${getNodeTypeColor(
                              property.type
                            )}`}
                          >
                            {property.type}
                          </Badge>
                          {property.parentBlock && (
                            <span className="text-xs text-gray-500">
                              (
                              {
                                (structure || []).find(
                                  (b) => b.id === property.parentBlock
                                )?.name
                              }
                              )
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          <Badge
                            className={`text-xs ${
                              property.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : property.status === "assigned"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {property.status}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSelectedProperty(property.id)}
                            className="p-0 w-6 h-6 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex gap-2 items-center"
            >
              Cancel
            </Button>

            {currentStage === "owner" ? (
              <Button
                type="button"
                onClick={handleNextStage}
                disabled={!selectedOwner}
                className="flex gap-2 items-center bg-primary hover:bg-primary/90"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={
                  selectedProperties.length === 0 ||
                  assignOwnerMutation.isPending
                }
                className="flex gap-2 items-center bg-green-600 hover:bg-green-700"
              >
                {assignOwnerMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Assign Owner ({selectedProperties.length})
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddOwner;
