import { Building2, Layers3, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
    editBlockStructure, editHouseStructure, editUnitStructure,
} from '@/actions/projects/structure';
import { PermissionGate } from '@/components/PermissionGate';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

import { unitSchemaStructure } from '../schema/unitSchemaStructure';
import DeleteNodeModal from './DeleteNodeModal';
import RoomModel from './RoomModel';
import { BlockForm, HouseForm } from './StructureForms';
import UnitModel from './unitModel';

// Helper function to extract numeric value from formatted currency string
const extractNumericValue = (
  value: string | number | null | undefined
): number => {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }

  if (typeof value === "string") {
    // Remove currency symbols, spaces, and commas, then parse
    const cleaned = value.replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

// import { UnitForm } from "./StructureForms";

// Update StructureNode type to include room_details and strongly type apartment_details
// Use the backend schema directly
type ApartmentDetails = {
  management_mode?: string;
  management_status?: string;
  size?: string;
  rental_price?: string | number;
  service_charge?: string | number | null;
  custom_service_charge?: string | null;
  status?: string;
  description?: string;
  currency?: string;
  unit_type?: string;
  sale_price?: string | number | null;
  [key: string]: any;
};

type VillaDetail = {
  management_mode?: string;
  name?: string;
  service_charge?: string | number | null;
  custom_service_charge?: string | null;
  [key: string]: any;
};

type StructureNode = {
  id: string;
  name: string;
  node_type: string;
  parent: string | null;
  children: StructureNode[];
  apartment_details?: ApartmentDetails | null;
  villa_detail?: VillaDetail | null;
  room_details?: {
    room_type: string;
    size: string;
    description?: string;
  } | null;
  description?: string;
  created_at?: string;
  status?: string;
  parentBlockId?: string; // Added for unit editing
};

interface ProjectStructureViewProps {
  nodes: StructureNode[];
  projectId: string;
  onStructureUpdated: (newTree: StructureNode[]) => void;
}

const getTypeIcon = (node_type: string) => {
  switch (node_type) {
    case "BLOCK":
      return <Building2 className="w-7 h-7 text-blue-600" />;
    case "HOUSE":
      return <Building2 className="w-7 h-7 text-green-600" />;
    case "BASEMENT":
      return <Building2 className="w-7 h-7 text-red-600" />;
    default:
      return <Layers3 className="w-7 h-7 text-primary" />;
  }
};

// Compute type-aware stats for a node
type StatType = "floors" | "apartments" | "rooms" | "slots";
interface NodeStats {
  floors: number;
  apartments: number;
  rooms: number;
}
function computeStats(node: StructureNode): NodeStats & { slots?: number } {
  const stats: NodeStats & { slots?: number } = {
    floors: 0,
    apartments: 0,
    rooms: 0,
  };
  if (node.node_type === "BLOCK" || node.node_type === "HOUSE") {
    for (const child of node.children) {
      if (child.node_type === "FLOOR") {
        stats.floors++;
        for (const grand of child.children) {
          if (grand.node_type === "UNIT") {
            stats.apartments++;
            stats.rooms += grand.children.filter(
              (r) => r.node_type === "ROOM"
            ).length;
          } else if (grand.node_type === "ROOM") {
            stats.rooms++;
          }
        }
      } else if (child.node_type === "UNIT") {
        stats.apartments++;
        stats.rooms += child.children.filter(
          (r) => r.node_type === "ROOM"
        ).length;
      } else if (child.node_type === "ROOM") {
        stats.rooms++;
      }
    }
  } else if (node.node_type === "BASEMENT") {
    // Count slots
    stats.slots = node.children.filter((c) => c.node_type === "SLOT").length;
  }
  return stats;
}

// Group children by parent (for modal display)
function groupChildrenByParent(
  children: StructureNode[],
  groupType: string,
  parentType?: string
) {
  const groups: Record<string, StructureNode[]> = {};

  for (const child of children) {
    if (child.node_type === groupType) {
      // For apartments, group by floor
      if (groupType === "UNIT") {
        const floorId = child.parent || "Other";
        if (!groups[floorId]) groups[floorId] = [];
        groups[floorId].push(child);
      }
      // For rooms, group by parent type
      else if (groupType === "ROOM") {
        if (parentType === "BLOCK") {
          // For BLOCK: group by unit (apartment)
          const unitId = child.parent || "Other";
          if (!groups[unitId]) groups[unitId] = [];
          groups[unitId].push(child);
        } else if (parentType === "HOUSE") {
          // For HOUSE: group by floor
          const floorId = child.parent || "Other";
          if (!groups[floorId]) groups[floorId] = [];
          groups[floorId].push(child);
        } else {
          // Fallback: group by parent
          const parentId = child.parent || "Other";
          if (!groups[parentId]) groups[parentId] = [];
          groups[parentId].push(child);
        }
      }
      // For other types, group by parent
      else {
        const parentId = child.parent || "Other";
        if (!groups[parentId]) groups[parentId] = [];
        groups[parentId].push(child);
      }
    }
    // Recursively check grandchildren
    if (child.children && child.children.length > 0) {
      const subGroups = groupChildrenByParent(
        child.children,
        groupType,
        parentType
      );
      for (const [k, v] of Object.entries(subGroups)) {
        if (!groups[k]) groups[k] = [];
        groups[k].push(...v);
      }
    }
  }
  return groups;
}

// Helper function to get floor name by ID
function getFloorNameById(
  floors: { id: string; name: string; number: number }[],
  floorId: string
): string {
  const floor = floors.find((f) => f.id === floorId);
  return floor ? floor.name : `Floor ${floorId}`;
}

// Helper function to get unit name by ID
function getUnitNameById(units: StructureNode[], unitId: string): string {
  const unit = units.find((u) => u.id === unitId);
  return unit ? unit.name : `Unit ${unitId}`;
}

const getChildStats = (node: StructureNode) => {
  // For FLOOR: count units (apartments) and rooms
  if (node.node_type === "FLOOR") {
    let apartments = 0;
    let rooms = 0;
    for (const child of node.children) {
      if (child.node_type === "UNIT") {
        apartments++;
        rooms += child.children.filter((r) => r.node_type === "ROOM").length;
      } else if (child.node_type === "ROOM") {
        rooms++;
      }
    }
    return [
      { label: "Apartments", value: apartments, type: "apartments" },
      { label: "Rooms", value: rooms, type: "rooms" },
    ];
  }
  // For UNIT: count rooms
  if (node.node_type === "UNIT") {
    const rooms = node.children.filter((r) => r.node_type === "ROOM").length;
    return [{ label: "Rooms", value: rooms, type: "rooms" }];
  }
  // For HOUSE: count floors and rooms
  if (node.node_type === "HOUSE") {
    let floors = 0;
    let rooms = 0;
    for (const child of node.children) {
      if (child.node_type === "FLOOR") {
        floors++;
        rooms += child.children.filter((r) => r.node_type === "ROOM").length;
      } else if (child.node_type === "ROOM") {
        rooms++;
      }
    }
    return [
      { label: "Floors", value: floors, type: "floors" },
      { label: "Rooms", value: rooms, type: "rooms" },
    ];
  }
  return [];
};

const ModalChildCard = ({
  node,
  onStatClick,
  projectId,
  onStructureUpdated,
  onEdit,
}: {
  node: StructureNode;
  onStatClick: (statType: string, node: StructureNode) => void;
  projectId: string;
  onStructureUpdated: (newTree: StructureNode[]) => void;
  onEdit?: (node: StructureNode) => void;
}) => {
  const [deleteNodeState, setDeleteNodeState] = useState<{
    id: string;
    name: string;
    node_type: string;
    projectId: string;
  } | null>(null);
  const [editNodeState, setEditNodeState] = useState<{
    id: string;
    name: string;
    node_type: string;
    projectId: string;
  } | null>(null);
  const stats = getChildStats(node);
  return (
    <>
      <Card className="flex flex-col gap-2 bg-white/80 p-4 border rounded-xl">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg shrink-0">
              {getTypeIcon(node.node_type)}
            </div>
            <div>
              <h3 className="max-w-[90px] font-semibold text-[16px] truncate">
                {node.name}
              </h3>
              <div className="mt-1 text-muted-foreground text-xs">
                {node.node_type}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <PermissionGate codename="delete_structure" showFallback={false}>
              <button
                className="hover:bg-red-100 p-2 rounded focus:outline-none"
                aria-label="Delete"
                tabIndex={0}
                role="button"
                onClick={() =>
                  setDeleteNodeState({
                    id: node.id,
                    name: node.name,
                    node_type: node.node_type,
                    projectId: projectId,
                  })
                }
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </PermissionGate>
            {/* Edit Button */}
            {node.node_type !== "FLOOR" && (
              <PermissionGate codename="edit_structure" showFallback={false}>
                <button
                  className="hover:bg-blue-100 p-2 rounded focus:outline-none"
                  aria-label="Edit"
                  tabIndex={0}
                  role="button"
                  onClick={() => {
                    if (onEdit) {
                      if (node.node_type === "ROOM") {
                        console.log("Room edit button clicked, node:", node);
                      }
                      onEdit(node);
                    } else {
                      if (node.node_type === "ROOM") {
                        console.log(
                          "Global room edit button clicked, node:",
                          node
                        );
                      }
                      setEditNodeState({
                        id: node.id,
                        name: node.name,
                        node_type: node.node_type,
                        projectId: projectId,
                        // Add other fields as needed
                      });
                    }
                  }}
                >
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm0 0V17h4"
                    />
                  </svg>
                </button>
              </PermissionGate>
            )}
          </div>
        </div>
        {/* Unit Type Badge for UNIT nodes, before rendering rooms */}
        {node.node_type === "UNIT" && node.apartment_details && (
          <div className="flex flex-wrap gap-2 mb-1">
            {node.apartment_details.unit_type && (
              <span className="bg-blue-100 px-2 py-0.5 border border-blue-200 rounded font-medium text-blue-700 text-xs">
                {node.apartment_details.unit_type}
              </span>
            )}
            {node.apartment_details.custom_service_charge && (
              <span className="bg-green-100 px-2 py-0.5 border border-green-200 rounded font-medium text-green-700 text-xs">
                Service: {node.apartment_details.custom_service_charge}
              </span>
            )}
          </div>
        )}
        {/* Villa Details Badge for HOUSE nodes */}
        {node.node_type === "HOUSE" && node.villa_detail && (
          <div className="flex flex-wrap gap-2 mb-1">
            {node.villa_detail.custom_service_charge && (
              <span className="bg-green-100 px-2 py-0.5 border border-green-200 rounded font-medium text-green-700 text-xs">
                Service: {node.villa_detail.custom_service_charge}
              </span>
            )}
          </div>
        )}
        {/* Stats */}
        {stats.length > 0 && (
          <div className="flex gap-3 mt-2">
            {stats.map((stat) => {
              // For FLOOR and UNIT nodes, show stats as non-interactive display only
              if (node.node_type === "FLOOR" || node.node_type === "UNIT") {
                return (
                  <div
                    key={stat.type}
                    className="flex flex-col flex-1 justify-center items-center bg-gray-50 p-2 border border-gray-200 rounded-lg"
                  >
                    <span className="mb-1 font-medium text-gray-500 text-xs">
                      {stat.label}
                    </span>
                    <span className="font-bold text-gray-700 text-lg tracking-tight">
                      {stat.value}
                    </span>
                  </div>
                );
              }

              // For other nodes, keep the interactive button
              return (
                <button
                  key={stat.type}
                  className="flex flex-col flex-1 justify-center items-center bg-primary/5 p-2 border border-primary/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200 cursor-pointer"
                  onClick={() => stat.value > 0 && onStatClick(stat.type, node)}
                  disabled={stat.value === 0}
                  aria-label={`Show ${stat.label.toLowerCase()} for ${
                    node.name
                  }`}
                  tabIndex={0}
                  role="button"
                >
                  <span className="mb-1 font-medium text-muted-foreground text-xs">
                    {stat.label}
                  </span>
                  <span className="font-bold text-primary text-lg tracking-tight">
                    {stat.value}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {/* Description */}
        {node.description && (
          <div className="mt-2 text-muted-foreground text-xs line-clamp-2">
            {node.description}
          </div>
        )}

        {/* Add Room Button removed - rooms are now added from the main room modal */}
      </Card>
      <DeleteNodeModal
        open={!!deleteNodeState}
        onClose={() => setDeleteNodeState(null)}
        node={deleteNodeState}
        onDeleted={() => setDeleteNodeState(null)}
        onStructureUpdated={(newTree) =>
          onStructureUpdated(newTree as StructureNode[])
        }
      />
    </>
  );
};

const StatModal = ({
  open,
  onClose,
  title,
  groups,
  onStatClick,
  projectId,
  onStructureUpdated,
  closeModal,
  statType,
  contextNode,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  groups: Record<string, StructureNode[]>;
  onStatClick: (statType: string, node: StructureNode) => void;
  projectId: string;
  onStructureUpdated: (newTree: StructureNode[]) => void;
  closeModal: () => void;
  statType: StatType;
  contextNode: StructureNode;
}) => {
  // Add modal state for adding apartments and rooms
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<StructureNode | null>(null);
  const [editRoom, setEditRoom] = useState<StructureNode | null>(null);

  // Extract real floor data from the contextNode (parent block/house)
  const getFloorsFromStructure = (node: StructureNode) => {
    const floors: { id: string; name: string; number: number }[] = [];

    // Find all FLOOR nodes in the children
    const findFloors = (children: StructureNode[]) => {
      for (const child of children) {
        if (child.node_type === "FLOOR") {
          floors.push({
            id: child.id,
            name: child.name,
            number:
              parseInt(child.name.replace(/\D/g, "")) || floors.length + 1,
          });
        }
        // Recursively check grandchildren
        if (child.children && child.children.length > 0) {
          findFloors(child.children);
        }
      }
    };

    findFloors(node.children);
    return floors;
  };

  // Extract all units for room grouping
  const getAllUnits = (node: StructureNode): StructureNode[] => {
    const units: StructureNode[] = [];

    const findUnits = (children: StructureNode[]) => {
      for (const child of children) {
        if (child.node_type === "UNIT") {
          units.push(child);
        }
        if (child.children && child.children.length > 0) {
          findUnits(child.children);
        }
      }
    };

    findUnits(node.children);
    return units;
  };

  const realFloors = getFloorsFromStructure(contextNode);
  const allUnits = getAllUnits(contextNode);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <DialogTitle className="font-bold text-[18px] md:text-[18px] leading-tight">
                {title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="py-4">
            <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
              {/* Add Apartment Button - always show */}
              {statType === "apartments" && (
                <PermissionGate codename="add_structure" showFallback={false}>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="group flex flex-col justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 shadow-sm hover:shadow-md border-2 border-blue-300/60 hover:border-blue-400 border-dashed rounded-xl h-full min-h-[140px] text-blue-600 hover:text-blue-700 transition-all duration-300"
                    aria-label="Add Apartment"
                    tabIndex={0}
                    role="button"
                  >
                    <div className="flex justify-center items-center bg-blue-100 group-hover:bg-blue-200 rounded-full w-12 h-12 transition-colors duration-300">
                      <Plus className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <span className="font-semibold text-blue-700">
                        Add Apartment
                      </span>
                      <p className="mt-1 text-blue-500 text-xs">
                        Create new apartment
                      </p>
                    </div>
                  </button>
                </PermissionGate>
              )}
              {/* Add Floor Button - always show */}
              {/* {statType === "floors" && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="group flex flex-col justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 shadow-sm hover:shadow-md border-2 border-green-300/60 hover:border-green-400 border-dashed rounded-xl h-full min-h-[140px] text-green-600 hover:text-green-700 transition-all duration-300"
                  aria-label="Add Floor"
                  tabIndex={0}
                  role="button"
                >
                  <div className="flex justify-center items-center bg-green-100 group-hover:bg-green-200 rounded-full w-12 h-12 transition-colors duration-300">
                    <Plus className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-center">
                    <span className="font-semibold text-green-700">
                      Add Floor
                    </span>
                    <p className="mt-1 text-green-500 text-xs">
                      Create new floor
                    </p>
                  </div>
                </button>
              )} */}
              {/* Add Room Button - always show */}
              {statType === "rooms" && (
                <PermissionGate codename="add_structure" showFallback={false}>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="group flex flex-col justify-center items-center gap-3 hover:bg-gradient-to-br hover:from-purple-50 hover:to-violet-50 shadow-sm hover:shadow-md border-2 border-purple-300/60 hover:border-purple-400 border-dashed rounded-xl h-full min-h-[140px] text-purple-600 hover:text-purple-700 transition-all duration-300"
                    aria-label="Add Room"
                    tabIndex={0}
                    role="button"
                  >
                    <div className="flex justify-center items-center bg-purple-100 group-hover:bg-purple-200 rounded-full w-12 h-12 transition-colors duration-300">
                      <Plus className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="text-center">
                      <span className="font-semibold text-purple-700">
                        Add Room
                      </span>
                      <p className="mt-1 text-purple-500 text-xs">
                        Create new room
                      </p>
                    </div>
                  </button>
                </PermissionGate>
              )}
              {/* Render existing items if any */}
              {Object.keys(groups).length > 0 ? (
                Object.entries(groups).map(([groupId, items]) => {
                  // Get group name based on type and parent type
                  let groupName = groupId;
                  if (statType === "apartments") {
                    groupName = getFloorNameById(realFloors, groupId);
                  } else if (statType === "rooms") {
                    if (contextNode.node_type === "BLOCK") {
                      // For BLOCK: group by unit name
                      groupName = getUnitNameById(allUnits, groupId);
                    } else if (contextNode.node_type === "HOUSE") {
                      // For HOUSE: group by floor name
                      groupName = getFloorNameById(realFloors, groupId);
                    } else {
                      groupName = getUnitNameById(allUnits, groupId);
                    }
                  }

                  return (
                    <div key={groupId} className="col-span-2">
                      <div className="mb-3">
                        <h3 className="mb-2 font-semibold text-muted-foreground text-sm">
                          {statType !== "floors" && groupName}
                        </h3>
                        <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
                          {items.map((item) => (
                            <ModalChildCard
                              key={item.id}
                              node={item}
                              onStatClick={onStatClick}
                              projectId={projectId}
                              onStructureUpdated={(tree) => {
                                onStructureUpdated(tree as StructureNode[]);
                                closeModal();
                              }}
                              onEdit={
                                statType === "apartments"
                                  ? setEditUnit
                                  : statType === "rooms"
                                  ? setEditRoom
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Empty state message when no items exist */
                <div className="flex flex-col justify-center items-center text-muted-foreground text-center">
                  <div className="mb-2 font-medium text-lg">
                    No {statType}s found
                  </div>
                  <div className="text-sm">
                    Click the button above to add your first {statType}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        {/* Add Apartment Modal */}
        {statType === "apartments" && isAddModalOpen && (
          <UnitModel
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            projectId={projectId}
            blockId={contextNode.id}
            floors={realFloors}
            onUnitCreated={(newStructure) => {
              // Update the structure and close all modals
              if (newStructure) {
                onStructureUpdated(newStructure as StructureNode[]);
              }
              // Close the add modal
              setIsAddModalOpen(false);
              // Close the stats modal
              closeModal();
            }}
            onCancel={() => {
              setIsAddModalOpen(false);
              closeModal();
              // Update structure when modal is closed
              onStructureUpdated([]);
            }}
          />
        )}
        {/* Edit Apartment Modal */}
        {statType === "apartments" && editUnit && (
          <UnitModel
            isOpen={!!editUnit}
            onClose={() => setEditUnit(null)}
            editMode
            initialValues={{
              id: editUnit.id, // Ensure id is included for edit
              floor: editUnit.parent || "",
              block: contextNode.id,
              apartment: {
                management_mode:
                  editUnit.apartment_details?.management_mode ||
                  "FULL_MANAGEMENT",
                management_status:
                  editUnit.apartment_details?.management_status || "for_rent",
                identifier: editUnit.name,
                size: editUnit.apartment_details?.size || "",
                rental_price: editUnit.apartment_details?.rental_price
                  ? Number(editUnit.apartment_details?.rental_price)
                  : 0,
                sale_price: editUnit.apartment_details?.sale_price
                  ? Number(editUnit.apartment_details?.sale_price)
                  : undefined,
                service_charge: String(
                  extractNumericValue(
                    editUnit.apartment_details?.service_charge
                  )
                ),
                status: editUnit.apartment_details?.status || "available",
                description: editUnit.apartment_details?.description || "",
                currency:
                  editUnit.apartment_details?.currency &&
                  editUnit.apartment_details.currency !== "null"
                    ? editUnit.apartment_details.currency
                    : "",
                unit_type:
                  editUnit.apartment_details?.unit_type &&
                  editUnit.apartment_details.unit_type !== "null"
                    ? editUnit.apartment_details.unit_type
                    : "",
              },
            }}
            blockId={contextNode.id}
            floors={realFloors}
            projectId={projectId}
            onUnitCreated={(newStructure) => {
              setEditUnit(null);
              if (newStructure) {
                onStructureUpdated(newStructure as StructureNode[]);
              }
              // Close the stats modal as well
              closeModal();
            }}
            onCancel={() => setEditUnit(null)}
          />
        )}
        {/* Edit Room Modal */}
        {statType === "rooms" && editRoom && (
          <RoomModel
            isOpen={!!editRoom}
            onClose={() => setEditRoom(null)}
            editMode
            initialValues={{
              id: editRoom.id, // Ensure id is included for edit
              // For BLOCK parent: block, floor, apartment, room
              ...(contextNode.node_type === "BLOCK"
                ? (() => {
                    // Find the floor and apartment/unit context
                    let floorId = "";
                    let apartmentId = "";
                    // If the parent of the room is a unit, then its parent is the floor
                    if (
                      editRoom.parent &&
                      allUnits.some((u) => u.id === editRoom.parent)
                    ) {
                      apartmentId = editRoom.parent;
                      // Find the unit node
                      const unitNode = allUnits.find(
                        (u) => u.id === apartmentId
                      );
                      if (unitNode && unitNode.parent) {
                        floorId = unitNode.parent;
                      }
                    } else {
                      // Parent is likely a floor
                      floorId = editRoom.parent || "";
                    }
                    return {
                      block: contextNode.id,
                      floor: floorId,
                      apartment: apartmentId,
                    };
                  })()
                : {
                    house: contextNode.id,
                    floor: editRoom.parent || "",
                  }),
              room: {
                room_type: editRoom.room_details?.room_type || "",
                size: editRoom.room_details?.size || "",
                description: editRoom.room_details?.description || "",
              },
            }}
            parentType={contextNode.node_type === "BLOCK" ? "BLOCK" : "HOUSE"}
            parentId={contextNode.id}
            projectId={projectId}
            floors={realFloors}
            apartments={
              contextNode.node_type === "BLOCK" ? allUnits : undefined
            }
            onRoomCreated={(newStructure) => {
              setEditRoom(null);
              if (newStructure) {
                onStructureUpdated(newStructure as StructureNode[]);
              }
              // Close the stats modal as well
              closeModal();
            }}
            onCancel={() => setEditRoom(null)}
          />
        )}
        {/* Add Room Modal */}
        {statType === "rooms" && isAddModalOpen && (
          <RoomModel
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            parentType={contextNode.node_type as "BLOCK" | "HOUSE"}
            parentId={contextNode.id}
            projectId={projectId}
            floorId={realFloors[0]?.id || ""}
            apartmentId={
              contextNode.node_type === "UNIT" ? contextNode.id : undefined
            }
            floors={realFloors}
            apartments={
              contextNode.node_type === "BLOCK" ? allUnits : undefined
            }
            onRoomCreated={(newStructure) => {
              // Update cache with full structure from server
              if (newStructure) {
                onStructureUpdated(newStructure as StructureNode[]);
              }
              // Close the add modal
              setIsAddModalOpen(false);
              // Close the stats modal
              closeModal();
            }}
            onCancel={() => {
              setIsAddModalOpen(false);
              closeModal();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

const StructureCard = ({
  node,
  projectId,
  onStructureUpdated,
  nodes,
}: {
  node: StructureNode;
  projectId: string;
  onStructureUpdated: (newTree: StructureNode[]) => void;
  nodes: StructureNode[];
}) => {
  const [modalStack, setModalStack] = useState<
    Array<{
      stat: StatType;
      groups: Record<string, StructureNode[]>;
      title: string;
      contextNode: StructureNode;
    }>
  >([]);
  const [deleteNodeState, setDeleteNodeState] = useState<{
    id: string;
    name: string;
    node_type: string;
    projectId: string;
  } | null>(null);
  const [editNodeState, setEditNodeState] = useState<{
    node: StructureNode | null;
    parent?: StructureNode | null;
  } | null>(null);
  // Add mutation for editing block
  const { mutate: editBlockMutate } = useMutation({
    mutationFn: async ({ name, floors }: { name: string; floors: number }) => {
      if (!editNodeState?.node) throw new Error("No block selected");
      return editBlockStructure(
        { name, floors },
        projectId,
        editNodeState.node.id
      );
    },
    onSuccess: (response: unknown) => {
      setEditNodeState(null);
      // Try to get the updated structure from response, else just refetch
      console.log(`response ${response}`);
      toast.success("Block updated successfully");
      if (
        typeof response === "object" &&
        response !== null &&
        "data" in response &&
        (response as { data?: { results?: StructureNode[] } }).data?.results
      ) {
        onStructureUpdated(
          (response as { data?: { results?: StructureNode[] } }).data!
            .results as StructureNode[]
        );
      } else {
        onStructureUpdated([]); // fallback: parent will refetch
      }
    },
    onError: (error: any) => {
      // Extract error message from the response
      const errorMessage = error?.message || "Failed to update block";
      toast.error(errorMessage);
    },
  });
  // Add mutation for editing house
  const { mutate: editHouseMutate } = useMutation({
    mutationFn: async ({
      name,
      floors,
      management_mode,
      service_charge,
    }: {
      name: string;
      floors: number;
      management_mode: string;
      service_charge?: number;
    }) => {
      if (!editNodeState?.node) throw new Error("No house selected");
      return editHouseStructure(
        { name, floors, management_mode, service_charge },
        projectId,
        editNodeState.node.id
      );
    },
    onSuccess: (response: unknown) => {
      setEditNodeState(null);
      // Try to get the updated structure from response, else just refetch
      toast.success("House updated successfully");
      if (
        typeof response === "object" &&
        response !== null &&
        "data" in response &&
        (response as { data?: { results?: StructureNode[] } }).data?.results
      ) {
        onStructureUpdated(
          (response as { data?: { results?: StructureNode[] } }).data!
            .results as StructureNode[]
        );
      } else {
        onStructureUpdated([]); // fallback: parent will refetch
      }
    },
    onError: (error: any) => {
      // Extract error message from the response
      const errorMessage = error?.message || "Failed to update house";
      toast.error(errorMessage);
    },
  });
  // Add mutation for editing unit
  const { mutate: editUnitMutate, isPending: isEditUnitPending } = useMutation({
    mutationFn: async ({
      data,
      unitId,
    }: {
      data: z.infer<typeof unitSchemaStructure>;
      unitId: string;
    }) => {
      console.log("Calling editUnitStructure with:", data, unitId);
      return editUnitStructure(data, projectId, unitId);
    },
    onSuccess: (response: unknown) => {
      // Only close modal if API call was made and returned success
      if (
        typeof response === "object" &&
        response !== null &&
        "data" in response &&
        (response as { data?: { results?: StructureNode[] } }).data?.results
      ) {
        setEditNodeState(null);
        onStructureUpdated(
          (response as { data: { results: StructureNode[] } }).data.results
        );
        toast.success("Unit updated successfully");
      } else {
        toast.error("Failed to update unit: No API response");
      }
    },
    onError: (err) => {
      toast.error(
        "Failed to update unit: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    },
  });
  const stats = computeStats(node);
  const statButtons: {
    label: string;
    value: number;
    type: StatType;
    groupType: string;
  }[] = [];
  if (node.node_type === "BLOCK") {
    statButtons.push(
      {
        label: "Floors",
        value: stats.floors,
        type: "floors",
        groupType: "FLOOR",
      },
      {
        label: "Apartments",
        value: stats.apartments,
        type: "apartments",
        groupType: "UNIT",
      },
      { label: "Rooms", value: stats.rooms, type: "rooms", groupType: "ROOM" }
    );
  } else if (node.node_type === "HOUSE") {
    statButtons.push(
      {
        label: "Floors",
        value: stats.floors,
        type: "floors",
        groupType: "FLOOR",
      },
      { label: "Rooms", value: stats.rooms, type: "rooms", groupType: "ROOM" }
    );
  } else if (node.node_type === "BASEMENT") {
    statButtons.push({
      label: "Slots",
      value: stats.slots || 0,
      type: "slots",
      groupType: "SLOT",
    });
  }
  const handleStatClick = (statType: string, contextNode: StructureNode) => {
    // Find the corresponding groupType for the statType
    const statButton = statButtons.find((btn) => btn.type === statType);
    const groupType = statButton?.groupType || statType.toUpperCase();

    // Group children of the contextNode by the groupType with parent type
    const groups = groupChildrenByParent(
      contextNode.children,
      groupType,
      contextNode.node_type
    );
    setModalStack((prev) => [
      ...prev,
      {
        stat: statType as StatType,
        groups,
        title: `All ${
          statType.charAt(0).toUpperCase() + statType.slice(1)
        } in ${contextNode.name}`,
        contextNode,
      },
    ]);
  };
  const handleModalClose = () => setModalStack([]);

  const unitEditInitialValues = useMemo(() => {
    if (!editNodeState?.node || editNodeState.node.node_type !== "UNIT")
      return undefined;
    const validManagementMode = (
      val: string | undefined
    ): "FULL_MANAGEMENT" | "SERVICE_ONLY" =>
      val === "SERVICE_ONLY" ? "SERVICE_ONLY" : "FULL_MANAGEMENT";
    const validManagementStatus = (
      val: string | undefined
    ): "for_rent" | "for_sale" =>
      val === "for_sale" ? "for_sale" : "for_rent";
    const validStatus = (
      val: string | undefined
    ): "available" | "rented" | "sold" =>
      val === "rented" ? "rented" : val === "sold" ? "sold" : "available";
    const validUnitType = (
      val: string | undefined
    ):
      | "1 Bedroom"
      | "2 Bedroom"
      | "3 Bedroom"
      | "4 Bedroom"
      | "5 Bedroom"
      | "6 Bedroom"
      | undefined =>
      [
        "1 Bedroom",
        "2 Bedroom",
        "3 Bedroom",
        "4 Bedroom",
        "5 Bedroom",
        "6 Bedroom",
      ].includes(val || "")
        ? (val as
            | "1 Bedroom"
            | "2 Bedroom"
            | "3 Bedroom"
            | "4 Bedroom"
            | "5 Bedroom"
            | "6 Bedroom")
        : undefined;
    const validCurrency = (val: string | undefined): string | undefined =>
      val && /^[0-9a-fA-F-]{36}$/.test(val) ? val : undefined;
    // rental_price must always be a number, never undefined
    let rental_price: number = 0;
    const rawRentalPrice = editNodeState.node.apartment_details?.rental_price;
    if (typeof rawRentalPrice === "number" && !isNaN(rawRentalPrice)) {
      rental_price = rawRentalPrice;
    } else if (typeof rawRentalPrice === "string") {
      const parsed = Number(rawRentalPrice);
      rental_price = !isNaN(parsed) ? parsed : 0;
    } else {
      rental_price = 0;
    }
    // service_charge - extract numeric value from formatted string and convert to string
    const service_charge = String(
      extractNumericValue(editNodeState.node.apartment_details?.service_charge)
    );
    return {
      id: editNodeState.node.id,
      floor: String(editNodeState.node.parent || ""),
      block: String(
        editNodeState.node.parentBlockId || editNodeState.node.parent || ""
      ),
      apartment: {
        management_mode: validManagementMode(
          editNodeState.node.apartment_details?.management_mode
        ),
        management_status: validManagementStatus(
          editNodeState.node.apartment_details?.management_status
        ),
        identifier: String(editNodeState.node.name),
        size: String(editNodeState.node.apartment_details?.size || ""),
        rental_price,
        sale_price: editNodeState.node.apartment_details?.sale_price
          ? Number(editNodeState.node.apartment_details?.sale_price)
          : undefined,
        status: validStatus(editNodeState.node.apartment_details?.status),
        description: String(
          editNodeState.node.apartment_details?.description || ""
        ),
        currency: validCurrency(editNodeState.node.apartment_details?.currency),
        unit_type: validUnitType(
          editNodeState.node.apartment_details?.unit_type
        ),
        service_charge,
      },
    };
  }, [editNodeState?.node]);
  const unitEditForm = useForm<z.infer<typeof unitSchemaStructure>>({
    resolver: zodResolver(unitSchemaStructure),
    defaultValues: unitEditInitialValues,
  });

  return (
    <Card className="bg-gradient-to-br from-white via-blue-50/40 to-blue-100/30 border rounded-2xl overflow-hidden transition-all duration-300">
      <div className="space-y-4 p-6">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-lg shrink-0">
              {getTypeIcon(node.node_type)}
            </div>
            <div>
              <h3 className="font-bold text-xl truncate">{node.name}</h3>
              <div className="mt-1 text-muted-foreground text-xs">
                {node.node_type}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <PermissionGate codename="delete_structure" showFallback={false}>
              <button
                className="hover:bg-red-100 p-2 rounded focus:outline-none"
                aria-label="Delete"
                tabIndex={0}
                role="button"
                onClick={() =>
                  setDeleteNodeState({
                    id: node.id,
                    name: node.name,
                    node_type: node.node_type,
                    projectId: projectId,
                  })
                }
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </PermissionGate>
            {/* Edit Button */}
            <PermissionGate codename="edit_structure" showFallback={false}>
              <button
                className="hover:bg-blue-100 p-2 rounded focus:outline-none"
                aria-label="Edit"
                tabIndex={0}
                role="button"
                onClick={() =>
                  setEditNodeState({
                    node,
                    parent: node.parent
                      ? nodes.find((n) => n.id === node.parent)
                      : null,
                  })
                }
              >
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm0 0V17h4"
                  />
                </svg>
              </button>
            </PermissionGate>
          </div>
        </div>
        {/* Description */}
        {node.description && (
          <div className="mb-2 text-muted-foreground text-sm line-clamp-2">
            {node.description}
          </div>
        )}
        {/* Villa Details Badge for HOUSE nodes */}
        {node.node_type === "HOUSE" && node.villa_detail && (
          <div className="flex flex-wrap gap-2 mb-2">
            {node.villa_detail.custom_service_charge && (
              <span className="bg-green-100 px-2 py-0.5 border border-green-200 rounded font-medium text-green-700 text-xs">
                Service: {node.villa_detail.custom_service_charge}
              </span>
            )}
          </div>
        )}
        {/* Stats */}
        <div className="flex gap-3 mt-2">
          {statButtons.map((stat) => (
            <button
              key={stat.type}
              className={`flex flex-col flex-1 justify-center items-center p-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200 cursor-pointer ${
                stat.value === 0
                  ? "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-600"
                  : "bg-primary/5 hover:bg-primary/10 border-primary/10 text-primary"
              }`}
              onClick={() => handleStatClick(stat.type, node)}
              aria-label={`Show ${stat.label.toLowerCase()} for ${node.name}`}
              tabIndex={0}
              role="button"
            >
              <span
                className={`mb-1 font-medium text-xs ${
                  stat.value === 0 ? "text-gray-400" : "text-muted-foreground"
                }`}
              >
                {stat.label}
              </span>
              <span
                className={`font-bold text-2xl tracking-tight ${
                  stat.value === 0 ? "text-gray-400" : "text-primary"
                }`}
              >
                {stat.value}
              </span>
            </button>
          ))}
        </div>
        {/* Footer */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-gray-400 text-xs">
            {node.created_at
              ? `Created: ${new Date(node.created_at).toLocaleDateString()}`
              : ""}
          </div>
        </div>
        {modalStack.length > 0 && (
          <StatModal
            open={modalStack.length > 0}
            onClose={handleModalClose}
            title={modalStack[modalStack.length - 1].title}
            groups={modalStack[modalStack.length - 1].groups}
            onStatClick={handleStatClick}
            projectId={projectId}
            onStructureUpdated={(tree) =>
              onStructureUpdated(tree as StructureNode[])
            }
            closeModal={handleModalClose}
            statType={modalStack[modalStack.length - 1].stat}
            contextNode={modalStack[modalStack.length - 1].contextNode}
          />
        )}
        {editNodeState && editNodeState.node && (
          <>
            {editNodeState.node.node_type === "BLOCK" && (
              <Dialog open={true} onOpenChange={() => setEditNodeState(null)}>
                <DialogContent className="mt-10 sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Edit Block</DialogTitle>
                  </DialogHeader>
                  <BlockForm
                    editMode
                    initialValues={{
                      blocks: [
                        {
                          name: editNodeState.node.name,
                          floors: editNodeState.node.children.filter(
                            (c) => c.node_type === "FLOOR"
                          ).length,
                        },
                      ],
                    }}
                    propertyId={projectId}
                    propertyName={editNodeState.node.name}
                    onSubmit={(data) => {
                      // Send both name and floors for editing
                      const name = data.blocks[0]?.name || "";
                      const floors = data.blocks[0]?.floors || 0;
                      editBlockMutate({ name, floors });
                      // Close the modal after submission
                      setEditNodeState(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
            {editNodeState.node.node_type === "HOUSE" && (
              <Dialog open={true} onOpenChange={() => setEditNodeState(null)}>
                <DialogContent className="mt-10 sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Edit House</DialogTitle>
                  </DialogHeader>
                  <HouseForm
                    editMode
                    initialValues={{
                      houses: [
                        {
                          name: editNodeState.node.name,
                          floors: editNodeState.node.children.filter(
                            (c) => c.node_type === "FLOOR"
                          ).length,
                          management_mode: (editNodeState.node.villa_detail
                            ?.management_mode === "SERVICE_ONLY"
                            ? "SERVICE_ONLY"
                            : "FULL_MANAGEMENT") as
                            | "FULL_MANAGEMENT"
                            | "SERVICE_ONLY",
                          service_charge: (() => {
                            const value =
                              editNodeState.node.villa_detail?.service_charge;
                            if (value === null || value === undefined) return 0;
                            const converted = extractNumericValue(value);
                            return isNaN(converted) ? 0 : converted;
                          })(),
                        },
                      ],
                    }}
                    propertyId={projectId}
                    propertyName={editNodeState.node.name}
                    onSubmit={(data) => {
                      // Send name, floors, management_mode, and service_cost for editing
                      const name = data.houses[0]?.name || "";
                      const floors = data.houses[0]?.floors || 0;
                      const management_mode =
                        data.houses[0]?.management_mode || "FULL_MANAGEMENT";
                      const service_charge =
                        data.houses[0]?.service_charge || 0;
                      editHouseMutate({
                        name,
                        floors,
                        management_mode,
                        service_charge,
                      });
                      // Close the modal after submission
                      setEditNodeState(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
            {editNodeState.node.node_type === "UNIT" && editNodeState.node && (
              <UnitModel
                isOpen={true}
                onClose={() => setEditNodeState(null)}
                editMode={true}
                initialValues={unitEditInitialValues}
                blockId={
                  editNodeState.node.parentBlockId ||
                  editNodeState.node.parent ||
                  ""
                }
                projectId={projectId}
                onUnitCreated={(newStructure) => {
                  setEditNodeState(null);
                  if (newStructure) {
                    onStructureUpdated(newStructure as StructureNode[]);
                  } else {
                    onStructureUpdated([]);
                  }
                }}
              />
            )}
            {editNodeState.node.node_type === "ROOM" && (
              <Dialog open={true} onOpenChange={() => setEditNodeState(null)}>
                <DialogContent className="mt-10 sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Edit Room</DialogTitle>
                  </DialogHeader>
                  <RoomModel
                    isOpen={true}
                    onClose={() => setEditNodeState(null)}
                    editMode
                    initialValues={{
                      // For BLOCK parent: block, floor, apartment, room
                      ...(editNodeState.parent?.node_type === "BLOCK"
                        ? {
                            block: editNodeState.parent.id,
                            floor: editNodeState.node.parent || "",
                            apartment: editNodeState.node.parent || "",
                          }
                        : {
                            house: editNodeState.parent?.id || "",
                            floor: editNodeState.node.parent || "",
                          }),
                      room: {
                        room_type:
                          editNodeState.node.room_details?.room_type || "",
                        size: editNodeState.node.room_details?.size || "",
                        description:
                          editNodeState.node.room_details?.description || "",
                      },
                    }}
                    parentType={
                      editNodeState.parent?.node_type === "BLOCK"
                        ? "BLOCK"
                        : "HOUSE"
                    }
                    parentId={editNodeState.parent?.id || ""}
                    projectId={projectId}
                    floors={[]}
                    onRoomCreated={(newStructure) => {
                      setEditNodeState(null);
                      if (newStructure) {
                        onStructureUpdated(newStructure as StructureNode[]);
                      } else {
                        onStructureUpdated([]);
                      }
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
        {/* Delete Node Modal */}
        <DeleteNodeModal
          open={!!deleteNodeState}
          onClose={() => setDeleteNodeState(null)}
          node={deleteNodeState}
          onDeleted={() => setDeleteNodeState(null)}
          onStructureUpdated={(newTree) =>
            onStructureUpdated(newTree as StructureNode[])
          }
        />
      </div>
    </Card>
  );
};

const ProjectStructureView = ({
  nodes,
  projectId,
  onStructureUpdated,
}: ProjectStructureViewProps) => {
  // Only show top-level blocks/houses
  const topLevel = nodes.filter(
    (n) =>
      n.node_type === "BLOCK" ||
      n.node_type === "HOUSE" ||
      n.node_type === "BASEMENT"
  );
  return (
    <div className="space-y-6">
      <ScrollArea className="pr-4 h-fit">
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
          {topLevel.map((node) => (
            <StructureCard
              key={node.id}
              node={node}
              projectId={projectId}
              onStructureUpdated={onStructureUpdated}
              nodes={nodes}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProjectStructureView;
