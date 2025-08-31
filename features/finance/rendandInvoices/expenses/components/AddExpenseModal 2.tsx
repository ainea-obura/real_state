import { ArrowRight, Check, Eye, File, Loader2, Upload, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createExpense } from '@/actions/finance/expense';
import { fetchVendorTable } from '@/actions/finance/vendor';
import { getCurrencyDropdown, getProjects } from '@/actions/projects/index';
import { getProjectStructure } from '@/actions/projects/structure';
import { getServices } from '@/actions/services';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PAYMENT_METHOD_CHOICES } from '@/features/finance/paymen-methods';
import { ServicesListResponse } from '@/features/services/schema/serviceSchema';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import SearchableSelect from './SearchableSelect';

interface TreeNode {
  node_id: string;
  node_type: string;
  name: string;
  children: TreeNode[];
}

function convertToTreeNode(node: any): TreeNode {
  return {
    node_id: node.id,
    node_type: node.node_type,
    name: node.name,
    children: (node.children || []).map(convertToTreeNode),
  };
}

// Count all descendant nodes of a given type
function countDescendants(nodes: TreeNode[], type: string): number {
  let count = 0;
  for (const node of nodes) {
    if (node.node_type === type) count++;
    if (node.children && node.children.length > 0) {
      count += countDescendants(node.children, type);
    }
  }
  return count;
}

const badgeColors: Record<string, string> = {
  PROJECT: "bg-blue-200 text-blue-700 border-blue-300",
  BLOCK: "bg-purple-200 text-purple-700 border-purple-300",
  HOUSE: "bg-green-200 text-green-700 border-green-300",
  FLOOR: "bg-yellow-200 text-yellow-700 border-yellow-300",
  UNIT: "bg-pink-200 text-pink-700 border-pink-300",
};

function NodeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-block border rounded px-1 py-0.5 text-[10px] font-semibold mr-2 align-middle ${
        badgeColors[type] || "bg-gray-200 text-gray-700 border-gray-300"
      }`}
      style={{ minWidth: 40, textAlign: "center" }}
    >
      {type}
    </span>
  );
}

function NodeActionIcons({
  isSelected,
  onSelect,
  onUnselect,
  onGoToChildren,
  selectedNode,
  showGoToChildren = true,
}: {
  isSelected: boolean;
  onSelect: () => void;
  onUnselect: () => void;
  onGoToChildren: () => void;
  selectedNode: TreeNode | null;
  showGoToChildren?: boolean;
}) {
  return (
    <div className="flex absolute right-0 -top-4 z-20 gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      {isSelected ? (
        <button
          aria-label="Unselect node"
          title="Unselect"
          className="flex justify-center items-center bg-red-100 shadow px-1 py-0.5 border-1 border-red-300 rounded-sm cursor-pointer"
          style={{ minWidth: 20, minHeight: 20 }}
          onClick={(e) => {
            e.stopPropagation();
            onUnselect();
          }}
        >
          <X className="w-4 h-4 text-red-600" />
        </button>
      ) : (
        <button
          aria-label="Select node"
          title="Select"
          className="flex justify-center items-center bg-green-100 shadow px-1 py-0.5 border-1 border-green-300 rounded-sm cursor-pointer"
          style={{ minWidth: 20, minHeight: 20 }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <Check className="w-4 h-4 text-green-700" />
        </button>
      )}
      {/* Only show Go to children if no node is selected and showGoToChildren is true */}
      {!selectedNode && showGoToChildren && (
        <button
          aria-label="Go to children"
          title="Go to children"
          className="flex justify-center items-center bg-blue-100 shadow px-1 py-0.5 border-1 border-blue-300 rounded-sm cursor-pointer"
          style={{ minWidth: 20, minHeight: 20 }}
          onClick={(e) => {
            e.stopPropagation();
            onGoToChildren();
          }}
        >
          <ArrowRight className="w-4 h-4 text-blue-700" />
        </button>
      )}
    </div>
  );
}

export const AddExpenseModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    service: "",
    vendor: "",
    invoiceDate: "",
    dueDate: "",
    amount: "",
    tax_amount: "",
    payment_method: "cash", // Set default to cash
    description: "",
    notes: "",
    currency: "",
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [childrenPhase, setChildrenPhase] = useState<{
    project: TreeNode;
  } | null>(null);
  const [blockPhase, setBlockPhase] = useState<{
    project: TreeNode;
    blocks: TreeNode[];
  } | null>(null);
  const [housePhase, setHousePhase] = useState<{
    project: TreeNode;
    houses: TreeNode[];
  } | null>(null);
  const [floorPhase, setFloorPhase] = useState<{
    block: TreeNode;
    floors: TreeNode[];
  } | null>(null);
  const [unitPhase, setUnitPhase] = useState<{
    floor: TreeNode;
    units: TreeNode[];
  } | null>(null);

  // Add validation function and error state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  function getStepValidationErrors(step: number): { [key: string]: string } {
    const newErrors: { [key: string]: string } = {};
    if (step === 1) {
      if (!selectedNode) newErrors["property"] = "Please select a property.";
    }
    if (step === 2) {
      if (!formData.service) newErrors["service"] = "Service is required.";
      if (!formData.vendor) newErrors["vendor"] = "Vendor is required.";
      if (!formData.invoiceDate)
        newErrors["invoiceDate"] = "Invoice date is required.";
      if (!formData.dueDate) newErrors["dueDate"] = "Due date is required.";
    }
    if (step === 3) {
      if (
        !formData.amount ||
        isNaN(Number(formData.amount)) ||
        Number(formData.amount) <= 0
      )
        newErrors["amount"] = "Amount must be greater than 0.";
      if (
        formData.tax_amount &&
        (isNaN(Number(formData.tax_amount)) ||
          Number(formData.tax_amount) < 0 ||
          Number(formData.tax_amount) > 100)
      )
        newErrors["tax_amount"] = "Tax must be between 0 and 100.";
      if (!formData.payment_method)
        newErrors["payment_method"] = "Payment method is required.";
    }
    return newErrors;
  }

  function validateStep(step: number): boolean {
    const newErrors = getStepValidationErrors(step);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) setStep((s) => s + 1);
  }
  function handleBack() {
    setStep((s) => s - 1);
  }

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedNode) throw new Error("No property selected");
      return createExpense({
        location_node_id: selectedNode.node_id,
        service_id: formData.service,
        vendor_id: formData.vendor,
        amount: Number(formData.amount),
        tax_amount: Number(formData.tax_amount || 0),
        total_amount:
          Number(formData.amount) +
          (Number(formData.amount) * Number(formData.tax_amount || 0)) / 100,
        invoice_date: formData.invoiceDate,
        due_date: formData.dueDate,
        payment_method: formData.payment_method,
        description: formData.description,
        notes: formData.notes,
        attachment: uploadedFiles[0]?.file,
        currency: formData.currency,
      });
    },
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.message || "Failed to create expense");
      }
      toast.success(data.message || "Billing created successfully");
      queryClient.invalidateQueries({ queryKey: ["expense-table"] });
      queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create expense");
    },
  });

  function handleSubmit() {
    if (validateStep(step)) {
      mutation.mutate();
    }
  }

  // 1. Fetch projects
  const {
    data: projectsData,
    isLoading: isProjectsLoading,
    isError: isProjectsError,
  } = useQuery({
    queryKey: ["projects", open],
    queryFn: () => getProjects({ is_dropdown: true }),
    enabled: open,
  });

  // 2. Fetch structures for each project in parallel
  const projectList = useMemo(() => {
    if (!projectsData?.data?.results) return [];
    return Array.isArray(projectsData.data.results)
      ? projectsData.data.results
      : [projectsData.data.results];
  }, [projectsData]);

  const structureQueries = useQueries({
    queries: projectList.map((p: any) => ({
      queryKey: ["project-structure", p.id, open],
      queryFn: () => getProjectStructure(p.id),
      enabled: open && !!p.node.id,
    })),
  });

  const {
    data: vendorTable,
    isLoading: isTableLoading,
    isError: isTableError,
    refetch: refetchVendors,
  } = useQuery({
    queryKey: ["vendor-table"],
    queryFn: () => fetchVendorTable({ isDropdown: true }),
  });

  // Fetch services from backend
  const { data: servicesData } = useQuery<ServicesListResponse>({
    queryKey: ["services"],
    queryFn: () => getServices({ is_dropdown: true }),
    staleTime: 0, // Always consider data stale for immediate updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: false, // Disable automatic refetching
  });

  // Check for error in the response data
  const errorMessage = servicesData && servicesData.isError ? (servicesData.message || "Failed to fetch services") : null;

  // Fetch currencies
  const {
    data: currenciesResponse,
    isLoading: isLoadingCurrencies,
    isError: isErrorCurrencies,
  } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const response = await getCurrencyDropdown();

      if(response.error){
        return [];
      }
      
      return response.data;
    },
  });

  console.log(currenciesResponse);
  const currencies = Array.isArray(currenciesResponse?.data)
    ? currenciesResponse.data
    : [];

  // Set default currency when loaded
  React.useEffect(() => {
    if (currencies.length > 0 && !formData.currency) {
      setFormData((f) => ({ ...f, currency: currencies[0].id }));
    }
  }, [currencies]);

  // 3. Build the tree structure after all structures are loaded
  const isStructuresLoading = structureQueries.some((q) => q.isLoading);
  const isStructuresError = structureQueries.some((q) => q.isError);

  const structure: TreeNode[] = useMemo(() => {
    if (!projectList.length || isStructuresLoading) return [];
    return projectList.map((p: any, idx: number) => {
      const structRes = structureQueries[idx]?.data;
      const children = Array.isArray(structRes?.data?.results)
        ? structRes.data.results.map(convertToTreeNode)
        : [];
      return {
        node_id: p.node.id,
        node_type: p.node.node_type,
        name: p.node.name,
        children,
      } satisfies TreeNode;
    });
  }, [projectList, structureQueries, isStructuresLoading]);

  // Reset state on open
  React.useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedNode(null);
    }
  }, [open]);

  // Handler for 'Go to children' on a project
  const handleGoToChildren = (project: TreeNode) => {
    setChildrenPhase({ project });
    setSelectedNode(null);
    setBlockPhase(null);
    setHousePhase(null);
  };

  // Handler for back from children phase
  const handleBackFromChildren = () => {
    setChildrenPhase(null);
    setSelectedNode(null);
    setBlockPhase(null);
    setHousePhase(null);
  };

  // Handler for back from block/house phase
  const handleBackFromBlockHouse = () => {
    setBlockPhase(null);
    setHousePhase(null);
    setSelectedNode(null);
    setFloorPhase(null);
    setUnitPhase(null);
  };

  // Handler for back from floor phase
  const handleBackFromFloor = () => {
    setFloorPhase(null);
    setUnitPhase(null);
    setSelectedNode(null);
  };

  // Handler for back from unit phase
  const handleBackFromUnit = () => {
    setUnitPhase(null);
    setSelectedNode(null);
  };

  // Handler for selecting All Blocks/All Houses
  const handleSelectAllBlocks = (project: TreeNode) => {
    const blocks = project.children.filter((c) => c.node_type === "BLOCK");
    setBlockPhase({ project, blocks });
    setSelectedNode(null);
  };
  const handleSelectAllHouses = (project: TreeNode) => {
    const houses = project.children.filter((c) => c.node_type === "HOUSE");
    setHousePhase({ project, houses });
    setSelectedNode(null);
  };

  // Handler for 'Go to children' on a block
  const handleGoToFloors = (block: TreeNode) => {
    const floors = block.children.filter((c) => c.node_type === "FLOOR");
    setFloorPhase({ block, floors });
    setSelectedNode(null);
  };

  // Handler for 'Go to children' on a floor
  const handleGoToUnits = (floor: TreeNode) => {
    const units = floor.children.filter((c) => c.node_type === "UNIT");
    setUnitPhase({ floor, units });
    setSelectedNode(null);
  };

  // Render children (non-root) as nested lists
  const renderTree = (nodes: TreeNode[]) => (
    <ul className="pl-2">
      {nodes.map((node) => {
        const isSelected = selectedNode?.node_id === node.node_id;
        return (
          <li key={node.node_id} className="relative group">
            {(isSelected || !selectedNode) && (
              <NodeActionIcons
                isSelected={isSelected}
                onSelect={() => setSelectedNode(node)}
                onUnselect={() => setSelectedNode(null)}
                onGoToChildren={() => {
                  /* to be implemented */
                }}
                selectedNode={selectedNode}
              />
            )}
            <div
              className={`flex items-center gap-2 py-1 px-2 rounded-md hover:bg-blue-50 ${
                isSelected ? "bg-green-100 border-green-500" : ""
              } ${
                selectedNode && !isSelected
                  ? "pointer-events-none opacity-60"
                  : ""
              }`}
            >
              <NodeBadge type={node.node_type} />
              <span className="font-medium text-gray-900">{node.name}</span>
            </div>
            {node.children.length > 0 && renderTree(node.children)}
          </li>
        );
      })}
    </ul>
  );

  // Render All Blocks / All Houses cards for children phase
  const renderAllBlocksHouses = (project: TreeNode) => {
    const blocks = countDescendants(project.children, "BLOCK");
    const houses = countDescendants(project.children, "HOUSE");
    // const isBlockSelected = selectedNode?.node_id === project.node_id && selectedNode?.node_type === "BLOCK";
    // const isHouseSelected = selectedNode?.node_id === project.node_id && selectedNode?.node_type === "HOUSE";
    return (
      <div>
        <button
          className="mb-4 text-sm text-blue-600 hover:underline"
          onClick={handleBackFromChildren}
        >
          ← Back to projects
        </button>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {blocks > 0 && (
            <li className={`relative list-none group`}>
              {/* Only show Go to children, no select/unselect */}
              <div className="absolute right-0 -top-4 z-20">
                <button
                  aria-label="Go to children"
                  title="Go to children"
                  className="flex justify-center items-center bg-blue-100 shadow px-1 py-0.5 border-1 border-blue-300 rounded-sm cursor-pointer"
                  style={{ minWidth: 20, minHeight: 20 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAllBlocks(project);
                  }}
                >
                  <ArrowRight className="w-4 h-4 text-blue-700" />
                </button>
              </div>
              <div
                className={`flex justify-between items-center px-2 py-3 bg-white rounded-md border border-gray-200 transition-colors hover:bg-blue-50`}
              >
                <div className="flex items-center min-w-0">
                  <NodeBadge type="BLOCK" />
                  <span className="text-base font-medium text-gray-900 truncate">
                    All Blocks
                  </span>
                </div>
                <div className="flex flex-shrink-0 gap-4 ml-4 text-xs text-gray-600">
                  <span>
                    Blocks: <span className="font-semibold">{blocks}</span>
                  </span>
                </div>
              </div>
            </li>
          )}
          {houses > 0 && (
            <li className={`relative list-none group`}>
              {/* Only show Go to children, no select/unselect */}
              <div className="absolute right-0 -top-4 z-20">
                <button
                  aria-label="Go to children"
                  title="Go to children"
                  className="flex justify-center items-center bg-blue-100 shadow px-1 py-0.5 border-1 border-blue-300 rounded-sm cursor-pointer"
                  style={{ minWidth: 20, minHeight: 20 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAllHouses(project);
                  }}
                >
                  <ArrowRight className="w-4 h-4 text-blue-700" />
                </button>
              </div>
              <div
                className={`flex justify-between items-center px-2 py-3 bg-white rounded-md border border-gray-200 transition-colors hover:bg-blue-50`}
              >
                <div className="flex items-center min-w-0">
                  <NodeBadge type="HOUSE" />
                  <span className="text-base font-medium text-gray-900 truncate">
                    All Houses
                  </span>
                </div>
                <div className="flex flex-shrink-0 gap-4 ml-4 text-xs text-gray-600">
                  <span>
                    Houses: <span className="font-semibold">{houses}</span>
                  </span>
                </div>
              </div>
            </li>
          )}
        </div>
      </div>
    );
  };

  // Render all blocks for a project
  const renderBlocks = (project: TreeNode, blocks: TreeNode[]) => (
    <div>
      <button
        className="mb-4 text-sm text-blue-600 hover:underline"
        onClick={handleBackFromBlockHouse}
      >
        ← Back to All Blocks
      </button>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {blocks.map((block) => {
          const floors = countDescendants(block.children, "FLOOR");
          const units = countDescendants(block.children, "UNIT");
          const isSelected =
            selectedNode?.node_id === block.node_id &&
            selectedNode?.node_type === "BLOCK";
          return (
            <li key={block.node_id} className={`relative list-none group`}>
              {(isSelected || !selectedNode) && (
                <NodeActionIcons
                  isSelected={isSelected}
                  onSelect={() =>
                    setSelectedNode({ ...block, node_type: "BLOCK" })
                  }
                  onUnselect={() => setSelectedNode(null)}
                  onGoToChildren={() => handleGoToFloors(block)}
                  selectedNode={selectedNode}
                />
              )}
              <div
                className={`flex items-center justify-between py-3 px-2 rounded-md border transition-colors bg-white
                  ${
                    isSelected
                      ? "z-10 bg-green-100 border-green-500"
                      : "border-gray-200 hover:bg-blue-50"
                  }
                  ${
                    selectedNode && !isSelected
                      ? "pointer-events-none opacity-60"
                      : ""
                  }
                `}
              >
                <div className="flex items-center min-w-0">
                  <NodeBadge type="BLOCK" />
                  <span className="text-base font-medium text-gray-900 truncate">
                    {block.name}
                  </span>
                </div>
                <div className="flex flex-shrink-0 gap-4 ml-4 text-xs text-gray-600">
                  <span>
                    Floors: <span className="font-semibold">{floors}</span>
                  </span>
                  <span>
                    Units: <span className="font-semibold">{units}</span>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </div>
    </div>
  );

  // Render all floors for a block
  const renderFloors = (block: TreeNode, floors: TreeNode[]) => {
    const filteredFloors = floors.filter(
      (floor) => countDescendants(floor.children, "UNIT") > 0
    );
    return (
      <div>
        <button
          className="mb-4 text-sm text-blue-600 hover:underline"
          onClick={handleBackFromFloor}
        >
          ← Back to All Floors
        </button>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {filteredFloors.map((floor) => {
            const units = countDescendants(floor.children, "UNIT");
            const isSelected =
              selectedNode?.node_id === floor.node_id &&
              selectedNode?.node_type === "FLOOR";
            return (
              <li key={floor.node_id} className={`relative list-none group`}>
                {(isSelected || !selectedNode) && (
                  <NodeActionIcons
                    isSelected={isSelected}
                    onSelect={() =>
                      setSelectedNode({ ...floor, node_type: "FLOOR" })
                    }
                    onUnselect={() => setSelectedNode(null)}
                    onGoToChildren={() => handleGoToUnits(floor)}
                    selectedNode={selectedNode}
                    showGoToChildren={true}
                  />
                )}
                <div
                  className={`flex items-center justify-between py-3 px-2 rounded-md border transition-colors bg-white
                    ${
                      isSelected
                        ? "z-10 bg-green-100 border-green-500"
                        : "border-gray-200 hover:bg-blue-50"
                    }
                    ${
                      selectedNode && !isSelected
                        ? "pointer-events-none opacity-60"
                        : ""
                    }
                  `}
                >
                  <div className="flex items-center min-w-0">
                    <NodeBadge type="FLOOR" />
                    <span className="text-base font-medium text-gray-900 truncate">
                      {floor.name}
                    </span>
                  </div>
                  <div className="flex flex-shrink-0 gap-4 ml-4 text-xs text-gray-600">
                    <span>
                      Units: <span className="font-semibold">{units}</span>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </div>
      </div>
    );
  };

  // Render all units for a floor
  const renderUnits = (floor: TreeNode, units: TreeNode[]) => (
    <div>
      <button
        className="mb-4 text-sm text-blue-600 hover:underline"
        onClick={handleBackFromUnit}
      >
        ← Back to All Units
      </button>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {units.map((unit) => {
          const isSelected =
            selectedNode?.node_id === unit.node_id &&
            selectedNode?.node_type === "UNIT";
          return (
            <li key={unit.node_id} className={`relative list-none group`}>
              {(isSelected || !selectedNode) && (
                <NodeActionIcons
                  isSelected={isSelected}
                  onSelect={() =>
                    setSelectedNode({ ...unit, node_type: "UNIT" })
                  }
                  onUnselect={() => setSelectedNode(null)}
                  onGoToChildren={() => {}}
                  selectedNode={selectedNode}
                  showGoToChildren={false}
                />
              )}
              <div
                className={`flex items-center justify-between py-3 px-2 rounded-md border transition-colors bg-white
                  ${
                    isSelected
                      ? "z-10 bg-green-100 border-green-500"
                      : "border-gray-200 hover:bg-blue-50"
                  }
                  ${
                    selectedNode && !isSelected
                      ? "pointer-events-none opacity-60"
                      : ""
                  }
                `}
              >
                <div className="flex items-center min-w-0">
                  <NodeBadge type="UNIT" />
                  <span className="text-base font-medium text-gray-900 truncate">
                    {unit.name}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </div>
    </div>
  );

  // Render all houses for a project
  const renderHouses = (project: TreeNode, houses: TreeNode[]) => (
    <div>
      <button
        className="mb-4 text-sm text-blue-600 hover:underline"
        onClick={handleBackFromBlockHouse}
      >
        ← Back to All Houses
      </button>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {houses.map((house) => {
          const floors = countDescendants(house.children, "FLOOR");
          const isSelected =
            selectedNode?.node_id === house.node_id &&
            selectedNode?.node_type === "HOUSE";
          return (
            <li key={house.node_id} className={`relative list-none group`}>
              {(isSelected || !selectedNode) && (
                <NodeActionIcons
                  isSelected={isSelected}
                  onSelect={() =>
                    setSelectedNode({ ...house, node_type: "HOUSE" })
                  }
                  onUnselect={() => setSelectedNode(null)}
                  onGoToChildren={() => {}}
                  selectedNode={selectedNode}
                  showGoToChildren={false}
                />
              )}
              <div
                className={`flex items-center justify-between py-3 px-2 rounded-md border transition-colors bg-white
                  ${
                    isSelected
                      ? "z-10 bg-green-100 border-green-500"
                      : "border-gray-200 hover:bg-blue-50"
                  }
                  ${
                    selectedNode && !isSelected
                      ? "pointer-events-none opacity-60"
                      : ""
                  }
                `}
              >
                <div className="flex items-center min-w-0">
                  <NodeBadge type="HOUSE" />
                  <span className="text-base font-medium text-gray-900 truncate">
                    {house.name}
                  </span>
                </div>
                <div className="flex flex-shrink-0 gap-4 ml-4 text-xs text-gray-600">
                  <span>
                    Floors: <span className="font-semibold">{floors}</span>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </div>
    </div>
  );

  // Render root projects as a responsive 2-column grid of rows
  const renderProjectRows = (projects: TreeNode[]) => (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {projects
        .map((project) => {
          const houses = countDescendants(project.children, "HOUSE");
          const blocks = countDescendants(project.children, "BLOCK");
          return { project, houses, blocks };
        })
        .filter(({ houses, blocks }) => houses > 0 || blocks > 0)
        .map(({ project, houses, blocks }) => {
          const isSelected = selectedNode?.node_id === project.node_id;
          return (
            <li key={project.node_id} className={`relative list-none group`}>
              {(isSelected || !selectedNode) && (
                <NodeActionIcons
                  isSelected={isSelected}
                  onSelect={() => setSelectedNode(project)}
                  onUnselect={() => setSelectedNode(null)}
                  onGoToChildren={() => handleGoToChildren(project)}
                  selectedNode={selectedNode}
                />
              )}
              <div
                className={`flex items-center justify-between py-3 px-2 rounded-md border transition-colors bg-white
                  ${
                    isSelected
                      ? "z-10 bg-green-100 border-green-500"
                      : "border-gray-200 hover:bg-blue-50"
                  }
                  ${
                    selectedNode && !isSelected
                      ? "pointer-events-none opacity-60"
                      : ""
                  }
                `}
              >
                <div className="flex items-center min-w-0">
                  <NodeBadge type={project.node_type} />
                  <span className="text-base font-medium text-gray-900 truncate">
                    {project.name}
                  </span>
                </div>
                <div className="flex flex-shrink-0 gap-4 ml-4 text-xs text-gray-600">
                  <span>
                    Houses: <span className="font-semibold">{houses}</span>
                  </span>
                  <span>
                    Blocks: <span className="font-semibold">{blocks}</span>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
    </div>
  );

  // File upload handlers for Step 2
  const handleFileUpload = (files: FileList | File[]) => {
    const newFiles = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handlePreview = (file: any) => {
    setPreviewFile(file);
  };

  const steps = [
    "Property",
    "Details & Documents",
    "Amounts",
    "Notes & Review",
  ];

  const isLoading = isProjectsLoading || isStructuresLoading;
  const isError = isProjectsError || isStructuresError;

  const isStepValid = Object.keys(getStepValidationErrors(step)).length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-full md:!max-w-6/12">
        <DialogHeader>
          <DialogTitle>Add Billing</DialogTitle>
        </DialogHeader>
        {/* Simple Stepper header (like AddToInvoiceModal) */}
        <div className="flex gap-4 justify-center items-center mb-6 w-full">
          {steps.map((label, idx) => {
            const isActive = step === idx + 1;
            return (
              <div key={label} className="flex gap-2 items-center">
                <div
                  className={`w-7 h-7 flex items-center justify-center rounded-full border text-sm font-bold
                    ${
                      isActive
                        ? "text-white bg-primary border-primary"
                        : "text-gray-400 bg-gray-100 border-gray-300"
                    }
                  `}
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isActive ? "text-primary" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
                {idx < steps.length - 1 && (
                  <span className="mx-2 text-gray-300">/</span>
                )}
              </div>
            );
          })}
        </div>
        {/* Step 1: Property Selection */}
        {step === 1 && (
          <div>
            {isLoading ? (
              <div className="py-8 text-center text-gray-400">
                Building structure…
              </div>
            ) : isError ? (
              <div className="py-8 text-center text-red-500">
                Error loading data.
              </div>
            ) : (
              <div className="p-2 rounded max-h-[60vh] overflow-visible">
                {unitPhase
                  ? renderUnits(unitPhase.floor, unitPhase.units)
                  : floorPhase
                  ? renderFloors(floorPhase.block, floorPhase.floors)
                  : blockPhase
                  ? renderBlocks(blockPhase.project, blockPhase.blocks)
                  : housePhase
                  ? renderHouses(housePhase.project, housePhase.houses)
                  : childrenPhase
                  ? renderAllBlocksHouses(childrenPhase.project)
                  : renderProjectRows(structure)}
              </div>
            )}
            <div className="flex gap-2 justify-end mt-6">
              {/* No Back on step 1 */}
              <Button
                onClick={handleNext}
                disabled={!isStepValid}
                className="px-6"
              >
                Next
              </Button>
            </div>
            {errors["property"] && (
              <p className="mt-2 text-xs text-red-500">{errors["property"]}</p>
            )}
          </div>
        )}
        {/* Step 2: Details & Documents */}
        {step === 2 && (
          <div className="px-2 py-4 space-y-6">
            {/* Row 1: Service and Vendor (searchable dropdowns) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Service *
                </label>
                {servicesData === undefined && (
                  <SearchableSelect
                    value={""}
                    onValueChange={() => {}}
                    options={[]}
                    placeholder={
                      isError ? "Failed to load services" : "Loading..."
                    }
                    className="opacity-60 pointer-events-none"
                  />
                )}
                {servicesData && (
                  <SearchableSelect
                    value={formData.service}
                    onValueChange={(val: string) =>
                      setFormData({ ...formData, service: val })
                    }
                    options={
                      servicesData && !servicesData.isError && servicesData.data?.results
                        ? servicesData.data.results.map((svc: any) => ({
                            value: svc.id,
                            label: svc.name,
                          }))
                        : []
                    }
                    placeholder="Select service"
                  />
                )}
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Vendor *
                </label>
                {isTableLoading && (
                  <SearchableSelect
                    value={""}
                    onValueChange={() => {}}
                    options={[]}
                    placeholder="Loading..."
                    className="opacity-60 pointer-events-none"
                  />
                )}
                {isTableError && (
                  <SearchableSelect
                    value={""}
                    onValueChange={() => {}}
                    options={[]}
                    placeholder="Failed to load vendors"
                    className="opacity-60 pointer-events-none"
                  />
                )}
                {vendorTable && Array.isArray(vendorTable.results) && (
                  <SearchableSelect
                    value={formData.vendor}
                    onValueChange={(val: string) =>
                      setFormData({ ...formData, vendor: val })
                    }
                    options={vendorTable.results.map((vendor: any) => ({
                      value: vendor.id,
                      label: vendor.name,
                    }))}
                    placeholder="Select vendor"
                  />
                )}
              </div>
            </div>
            {/* Row 2: Invoice Date and Due Date */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Invoice Date
                </label>
                <input
                  type="date"
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  value={formData.invoiceDate || ""}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  value={formData.dueDate || ""}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
            {/* Row 3: Attachments */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex gap-2 items-center mb-3">
                <Upload className="w-4 h-4 text-blue-500" />
                <span className="font-semibold">
                  Vendor Invoices & Documents
                </span>
              </div>
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver
                    ? "bg-blue-50 border-blue-500"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                <p className="mb-2 text-gray-600">
                  Drag and drop invoice files here, or{" "}
                  <label className="text-blue-600 cursor-pointer hover:text-blue-700">
                    browse files
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files && handleFileUpload(e.target.files)
                      }
                    />
                  </label>
                </p>
                <p className="text-xs text-gray-500">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX (Max
                  10MB each)
                </p>
              </div>
              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Uploaded Files:
                  </h4>
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex justify-between items-center p-3 bg-white rounded-lg border"
                    >
                      <div className="flex gap-3 items-center">
                        <File className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {file.preview && (
                          <button
                            type="button"
                            onClick={() => handlePreview(file)}
                            className="p-1 rounded hover:bg-gray-100"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="p-1 rounded hover:bg-red-100"
                          title="Remove"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Navigation buttons for Step 2 */}
              <div className="flex gap-2 justify-end mt-6">
                <Button variant="secondary" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid}
                  className="px-6"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="px-2 py-4 space-y-6">
            {/* First row: Currency, Amount */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Currency Select */}
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Currency *
                </label>
                <select
                  className="px-3 py-2 w-full text-gray-700 rounded border focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, currency: e.target.value }))
                  }
                  disabled={isLoadingCurrencies || isErrorCurrencies}
                  required
                  aria-required="true"
                >
                  {isLoadingCurrencies && (
                    <option value="" disabled>
                      Loading currencies...
                    </option>
                  )}
                  {isErrorCurrencies && (
                    <option value="" disabled>
                      Failed to load currencies
                    </option>
                  )}
                  {!isLoadingCurrencies &&
                  !isErrorCurrencies &&
                  currencies.length > 0
                    ? currencies.map((currency) => (
                        <option key={currency.id} value={currency.id}>
                         {currency.name} ({currency.code})
                        </option>
                      ))
                    : null}
                </select>
              </div>
              {/* Amount */}
              <div>
                <label
                  className="block mb-2 text-sm font-medium text-gray-700"
                  htmlFor="amount"
                >
                  Amount *
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={0}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  value={formData.amount || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setFormData((f) => ({ ...f, amount: '' }));
                    } else {
                      const parsed = parseFloat(val);
                      if (!isNaN(parsed) && parsed >= 0) {
                        setFormData((f) => ({ ...f, amount: val }));
                      }
                    }
                  }}
                  placeholder="0.00"
                  required
                  aria-required="true"
                />
              </div>
            </div>
            {/* Second row: Tax, Total Amount */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Tax Percentage */}
              <div>
                <label
                  className="block mb-2 text-sm font-medium text-gray-700"
                  htmlFor="tax_amount"
                >
                  Tax (%)
                </label>
                <input
                  id="tax_amount"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  value={formData.tax_amount || ""}
                  onChange={(e) => {
                    let val = e.target.value;
                    // Clamp value between 0 and 100
                    if (
                      val !== "" &&
                      (parseFloat(val) < 0 || parseFloat(val) > 100)
                    )
                      return;
                    setFormData((f) => ({ ...f, tax_amount: val }));
                  }}
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>
              {/* Total Amount (read-only) */}
              <div>
                <label
                  className="block mb-2 text-sm font-medium text-gray-700"
                  htmlFor="total_amount"
                >
                  Total Amount
                </label>
                <input
                  id="total_amount"
                  type="number"
                  className="px-3 py-2 w-full text-gray-700 bg-gray-50 rounded-lg border border-gray-200 cursor-not-allowed"
                  value={(() => {
                    const amount = parseFloat(formData.amount || "0");
                    const tax = parseFloat(formData.tax_amount || "0");
                    if (isNaN(amount) || isNaN(tax)) return "0.00";
                    return (amount + (amount * tax) / 100).toFixed(2);
                  })()}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                />
              </div>
            </div>
            {/* Third row: Payment Method */}
            {/* Payment method is hidden and defaults to "cash" */}
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="secondary" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!isStepValid}
                className="px-6"
              >
                Next
              </Button>
            </div>
            {/* Error messages */}
            {["amount", "tax_amount", "payment_method"].map(
              (f) =>
                errors[f] && (
                  <p key={f} className="mt-2 text-xs text-red-500">
                    {errors[f]}
                  </p>
                )
            )}
          </div>
        )}
        {step === 4 && (
          <div className="px-2 py-4 space-y-6">
            <div>
              <label
                htmlFor="description"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Description{" "}
                <span className="text-xs text-gray-400">(optional)</span>
              </label>
              <textarea
                id="description"
                className="px-3 py-2 border border-gray-300 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 w-full min-h-[80px] resize-y"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Add a description for this expense (optional)"
                rows={3}
              />
            </div>
            <div>
              <label
                htmlFor="notes"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Notes <span className="text-xs text-gray-400">(optional)</span>
              </label>
              <textarea
                id="notes"
                className="px-3 py-2 border border-gray-300 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 w-full min-h-[60px] resize-y"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any additional notes (optional)"
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="secondary" onClick={handleBack} disabled={mutation.isPending}>
                Back
              </Button>
              <Button onClick={handleSubmit} className="px-6" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
