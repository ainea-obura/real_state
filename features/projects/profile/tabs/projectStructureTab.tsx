import { Building2, Grid3X3, Layers3, Map, FileSpreadsheet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { getProjectStructure } from '@/actions/projects/structure';
import { PermissionGate } from '@/components/PermissionGate';
import StatisticsCard from '@/components/statisticsCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ExcelUploadModal from './Components/structure/ExcelUploadModal';

import { ParentStructure } from './Components/schema/AddStructureSchema';
import { StructureNode } from './Components/schema/projectStructureSchema';
import AddStructureModal from './Components/structure/AddStructureModal';
import ProjectStructureView from './Components/structure/projectStructureView';

export default function ProjectStructureTab({
  projectId,
  openModal,
}: {
  projectId: string;
  openModal?: string | null;
}) {
  const [nodes, setNodes] = useState<StructureNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [preselectType, setPreselectType] = useState<"block" | "house" | null>(
    null
  );

  useEffect(() => {
    if (openModal === "block" || openModal === "house") {
      setIsAddModalOpen(true);
      setPreselectType(openModal);
    }
  }, [openModal]);

  const fetchStructure = async () => {
    setIsLoading(true);
    try {
      const response = await getProjectStructure(projectId);
      if (response.error) {
        toast.error("Failed to fetch structure");
      } else {
        const results = response.data.results;
        if (Array.isArray(results)) {
          setNodes(
            results.map((n) => ({
              ...n,
              children: n.children ?? [],
            })) as StructureNode[]
          );
        } else {
          setNodes([]);
        }
      }
    } catch {
      toast.error("Failed to fetch structure");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStructure();
  }, [projectId]);

  // New: Replace local tree with server tree after any mutation
  const handleStructureUpdated = () => {
    fetchStructure();
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4 animate-pulse">
          <div className="w-1/4 h-8 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-40 bg-gray-200 rounded" />
            <div className="h-40 bg-gray-200 rounded" />
          </div>
        </div>
      </Card>
    );
  }

  // Compute statistics dynamically based on available structure types
  const computeStats = () => {
    const stats = {
      blocks: 0,
      houses: 0,
      floors: 0,
      apartments: 0,
      rooms: 0,
    };

    // Track floor counts for each block/house to find the maximum
    const blockFloorCounts: number[] = [];
    const houseFloorCounts: number[] = [];

    const countNodes = (
      nodeList: StructureNode[],
      currentBlockFloors = 0,
      currentHouseFloors = 0
    ) => {
      nodeList.forEach((node) => {
        if (!node || typeof node !== "object") return;
        const typedNode = node as StructureNode;

        switch (typedNode.node_type) {
          case "BLOCK":
            stats.blocks++;
            // Reset floor count for new block
            const blockFloorCount = countFloorsInNode(typedNode);
            blockFloorCounts.push(blockFloorCount);
            break;
          case "HOUSE":
            stats.houses++;
            // Reset floor count for new house
            const houseFloorCount = countFloorsInNode(typedNode);
            houseFloorCounts.push(houseFloorCount);
            break;
          case "FLOOR":
            stats.floors++;
            break;
          case "UNIT":
            stats.apartments++;
            break;
          case "ROOM":
            stats.rooms++;
            break;
        }
        // Recursively count children
        if (
          Array.isArray(typedNode.children) &&
          typedNode.children.length > 0
        ) {
          countNodes(
            typedNode.children,
            currentBlockFloors,
            currentHouseFloors
          );
        }
      });
    };

    // Helper function to count floors within a specific node (block/house)
    const countFloorsInNode = (node: StructureNode): number => {
      let floorCount = 0;

      const countFloorsRecursive = (currentNode: StructureNode) => {
        if (currentNode.node_type === "FLOOR") {
          floorCount++;
        }
        if (
          Array.isArray(currentNode.children) &&
          currentNode.children.length > 0
        ) {
          currentNode.children.forEach((child) => {
            if (child && typeof child === "object") {
              countFloorsRecursive(child as StructureNode);
            }
          });
        }
      };

      countFloorsRecursive(node);
      return floorCount;
    };

    countNodes(nodes);

    // Calculate the maximum floors from all blocks and houses
    const maxBlockFloors =
      blockFloorCounts.length > 0 ? Math.max(...blockFloorCounts) : 0;
    const maxHouseFloors =
      houseFloorCounts.length > 0 ? Math.max(...houseFloorCounts) : 0;

    // Use the larger of the two (blocks vs houses)
    stats.floors = Math.max(maxBlockFloors, maxHouseFloors);

    return stats;
  };

  const stats = computeStats();

  // Build the list of ParentStructure for the AddStructureModal
  const existingStructures: ParentStructure[] = Array.isArray(nodes)
    ? nodes
        .filter(
          (n) =>
            n &&
            typeof n === "object" &&
            (n as StructureNode).node_type !== "ROOM"
        )
        .map((n) => {
          const node = n as StructureNode;
          return {
            id: node.id,
            name: node.name,
            type: node.node_type === "UNIT" ? "APARTMENT" : node.node_type,
            children: Array.isArray(node.children)
              ? node.children
                  .filter(
                    (c) =>
                      c &&
                      typeof c === "object" &&
                      (c as StructureNode).node_type !== "ROOM"
                  )
                  .map((c) => {
                    const child = c as StructureNode;
                    return {
                      id: child.id,
                      name: child.name,
                      type:
                        child.node_type === "UNIT"
                          ? "APARTMENT"
                          : child.node_type,
                    };
                  })
              : [],
          };
        })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Property Structure</h2>
          <p className="text-muted-foreground">
            Manage your property&apos;s blocks, floors, apartments, and rooms
          </p>
        </div>
        <PermissionGate codename="add_structure" showFallback={false}>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsExcelModalOpen(true)}
              className="flex gap-2 items-center"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Upload Excel
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)}>Add Structure</Button>
          </div>
        </PermissionGate>
      </div>

      {/* Dynamic Statistics Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.blocks > 0 && (
          <StatisticsCard
            title="Blocks"
            value={stats.blocks.toString()}
            description="Total blocks in the property"
            icon={Building2}
          />
        )}

        {stats.houses > 0 && (
          <StatisticsCard
            title="Houses"
            value={stats.houses.toString()}
            description="Total houses in the property"
            icon={Building2}
          />
        )}

        {stats.floors > 0 && (
          <StatisticsCard
            title="Floors"
            value={stats.floors.toString()}
            description="Total floors in the property"
            icon={Map}
          />
        )}

        {stats.apartments > 0 && (
          <StatisticsCard
            title="Apartments"
            value={stats.apartments.toString()}
            description="Total apartments in the property"
            icon={Grid3X3}
          />
        )}

        {stats.rooms > 0 && (
          <StatisticsCard
            title="Rooms"
            value={stats.rooms.toString()}
            description="Total rooms in the property"
            icon={Layers3}
          />
        )}
      </div>

      <ProjectStructureView
        nodes={Array.isArray(nodes) ? (nodes as StructureNode[]) : []}
        projectId={projectId}
        onStructureUpdated={handleStructureUpdated}
      />

      <AddStructureModal
        propertyId={projectId}
        propertyName={"Block"}
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setPreselectType(null);
        }}
        existingStructures={existingStructures}
        onStructureUpdated={handleStructureUpdated}
        preselectType={preselectType}
      />

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        projectId={projectId}
        onStructureUpdated={handleStructureUpdated}
      />
    </div>
  );
}
