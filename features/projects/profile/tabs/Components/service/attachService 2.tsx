import { Building2, Check, ChevronDown, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getCurrencyDropdown } from "@/actions/projects";
import { createProjectServiceAssignment } from "@/actions/projects/services";
import { getProjectStructure } from "@/actions/projects/structure";
import { getServices } from "@/actions/services/index";
import AsyncServiceCombobox from "@/components/ui/async-service-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StructureNode } from "../schema/projectStructureSchema";

export type PropertyType = "block" | "house";

interface AttachServiceProps {
  selectedType: PropertyType | null;
  onSelect: (type: PropertyType) => void;
  blockCount?: number;
  houseCount?: number;
}

interface AttachServiceModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  blockCount?: number;
  houseCount?: number;
  projectName?: string;
  projectNodeId?: string; // Add this prop for the LocationNode ID
}

// Helper functions to process real structure data
const processStructureData = (nodes: StructureNode[]) => {
  const blocks: StructureNode[] = [];
  const houses: StructureNode[] = [];

  const processNode = (node: any) => {
    if (node.node_type === "BLOCK") {
      blocks.push(node);
    } else if (node.node_type === "HOUSE") {
      houses.push(node);
    }

    // Recursively process children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => processNode(child));
    }
  };

  nodes.forEach(processNode);
  return { blocks, houses };
};

const getUnitsFromBlock = (block: StructureNode) => {
  const units: StructureNode[] = [];

  const findUnits = (node: any) => {
    if (node.node_type === "UNIT") {
      units.push(node);
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => findUnits(child));
    }
  };

  findUnits(block);
  return units;
};

const getFloorsFromBlock = (block: StructureNode) => {
  const floors: StructureNode[] = [];

  const findFloors = (node: any) => {
    if (node.node_type === "FLOOR") {
      floors.push(node);
    }

    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => findFloors(child));
    }
  };

  findFloors(block);
  return floors;
};

const propertyTypes = [
  {
    type: "block" as const,
    label: "Blocks",
    description: "Attach services to blocks",
    icon: Building2,
    gradient: "from-blue-500/10 via-blue-500/5 to-blue-600/10",
    hoverGradient:
      "hover:from-blue-500/20 hover:via-blue-500/15 hover:to-blue-600/20",
    iconColor: "text-blue-600",
    borderColor: "group-hover:border-blue-500/50",
  },
  {
    type: "house" as const,
    label: "Houses",
    description: "Attach services to houses",
    icon: Home,
    gradient: "from-purple-500/10 via-purple-500/5 to-purple-600/10",
    hoverGradient:
      "hover:from-purple-500/20 hover:via-purple-500/15 hover:to-purple-600/20",
    iconColor: "text-purple-600",
    borderColor: "group-hover:border-purple-500/50",
  },
];

const AttachService = ({
  selectedType,
  onSelect,
  blockCount = 0,
  houseCount = 0,
  structureData = [],
}: AttachServiceProps & { structureData?: StructureNode[] }) => {
  // Calculate real counts from structure data
  const { blocks, houses } = processStructureData(structureData);
  const realBlockCount = blocks.length;
  const realHouseCount = houses.length;

  // Filter property types based on what exists
  const availablePropertyTypes = propertyTypes.filter(({ type }) => {
    if (type === "block") return realBlockCount > 0;
    if (type === "house") return realHouseCount > 0;
    return false;
  });

  // If no blocks or houses exist, show warning
  if (availablePropertyTypes.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center p-8 text-center">
        <div className="flex justify-center items-center mb-4 w-16 h-16 bg-orange-100 rounded-full">
          <Building2 className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          No Property Structures Found
        </h3>
        <p className="mb-4 max-w-md text-gray-600">
          You need to create blocks or houses in your project structure before
          you can assign services to them.
        </p>
        <div className="flex gap-2 items-center text-sm text-gray-500">
          <span>💡</span>
          <span>Go to Property Structure to add blocks or houses</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`gap-4 grid ${
        availablePropertyTypes.length === 1 ? "grid-cols-1" : "grid-cols-2"
      } p-1`}
    >
      {availablePropertyTypes.map(
        ({
          type,
          label,
          description,
          icon: Icon,
          gradient,
          hoverGradient,
          iconColor,
          borderColor,
        }) => {
          const count = type === "block" ? realBlockCount : realHouseCount;

          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={cn(
                "group flex flex-col items-start p-6 rounded-xl transition-all duration-300",
                "bg-gradient-to-br border border-transparent",
                gradient,
                hoverGradient,
                borderColor,
                selectedType === type && "ring-2 ring-primary ring-offset-2",
                "hover:scale-[1.02]"
              )}
            >
              <div
                className={cn(
                  "flex justify-center items-center mb-4 w-12 h-12 rounded-xl",
                  "shadow-sm backdrop-blur-sm bg-white/90",
                  "transition-transform duration-300 group-hover:scale-110"
                )}
              >
                <Icon className={cn("w-6 h-6", iconColor)} />
              </div>

              <div className="text-left">
                <h3 className="mb-1.5 font-semibold text-gray-900">{label}</h3>
                <p className="text-sm leading-snug text-gray-600">
                  {description}
                </p>
                <p className="mt-2 text-sm font-medium text-primary">
                  {count} {type === "block" ? "blocks" : "houses"}
                </p>
              </div>

              {selectedType === type && (
                <div className="-bottom-0.5 left-1/2 absolute bg-primary rounded-full w-1 h-1 -translate-x-1/2" />
              )}
            </button>
          );
        }
      )}
    </div>
  );
};

const BlockSelectionStep = ({
  onBack,
  onNext,
  selectedUnits,
  setSelectedUnits,
  structureData,
  projectId,
  onClose,
}: {
  onBack: () => void;
  onNext: (units: string[], selectedService: any) => void;
  selectedUnits: string[];
  setSelectedUnits: (units: string[]) => void;
  structureData: StructureNode[];
  projectId: string;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [blocksDropdownOpen, setBlocksDropdownOpen] = useState(false);
  const [unitsDropdownOpen, setUnitsDropdownOpen] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [isMetered, setIsMetered] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      createProjectServiceAssignment(projectId, payload),
    onSuccess: () => {
      toast.success("Service assigned successfully!");
      queryClient.refetchQueries({
        queryKey: ["project-service-overview", projectId],
      });
      onClose();
    },
    onError: (error: any) => {
      if (typeof error?.message === "string") {
        toast.error(error.message);
      } else {
        toast.error("Failed to assign service");
      }
      queryClient.refetchQueries({
        queryKey: ["project-service-overview", projectId],
      });
    },
  });

  const handleBlockToggle = (blockId: string) => {
    setSelectedBlocks(
      selectedBlocks.includes(blockId)
        ? selectedBlocks.filter((id) => id !== blockId)
        : [...selectedBlocks, blockId]
    );
  };

  const handleUnitToggle = (unitId: string) => {
    setSelectedUnits(
      selectedUnits.includes(unitId)
        ? selectedUnits.filter((id) => id !== unitId)
        : [...selectedUnits, unitId]
    );
  };

  const getSelectedBlocksCount = () => selectedBlocks.length;
  const getSelectedUnitsCount = () => selectedUnits.length;

  const { blocks } = processStructureData(structureData);
  // Only include blocks that have at least one unit
  const blocksWithUnits = blocks.filter(
    (block) => getUnitsFromBlock(block).length > 0
  );
  const totalBlocks = blocksWithUnits.length;
  const availableUnits = blocksWithUnits
    .filter((block: any) => selectedBlocks.includes(block.id))
    .flatMap((block: any) => getUnitsFromBlock(block));

  const totalAvailableUnits = availableUnits.length;

  const { data: servicesData, isLoading: isServiceLoading } = useQuery({
    queryKey: ["services", serviceQuery],
    queryFn: () =>
      getServices({
        page: 1,
        pageSize: 5,
        is_active: true,
        ...(serviceQuery && { search: serviceQuery }),
      }),
  });

  const services =
    servicesData &&
    typeof servicesData === "object" &&
    "data" in servicesData &&
    !servicesData.isError &&
    servicesData.data?.results
      ? servicesData.data.results
      : [];

  useEffect(() => {
    if (!selectedService) return;
    if (selectedService.pricing_type === "FIXED") {
      setCurrency(selectedService.currency || "");
      setAmount(selectedService.base_price || "");
    } else if (selectedService.pricing_type === "PERCENTAGE") {
      setAmount(selectedService.percentage_rate || "");
      // Keep the currency for percentage pricing
      setCurrency(selectedService.currency || "");
    } else {
      setAmount("");
      setCurrency("");
    }
  }, [selectedService]);

  const { data: currenciesResponse, isLoading: isLoadingCurrencies } = useQuery(
    {
      queryKey: ["currencies"],
      queryFn: getCurrencyDropdown,
    }
  );
  type Currency = { id: string; code: string; name: string; symbol: string };
  const currencies: Currency[] = Array.isArray(
    (currenciesResponse as any)?.data.data
  )
    ? (currenciesResponse as any).data.data
    : Array.isArray(currenciesResponse)
    ? currenciesResponse
    : [];

  const handleContinue = () => {
    if (!selectedService) return;
    if (selectedUnits.length === 0) return;
    // For FIXED and PERCENTAGE, currency is required
    if (
      (selectedService.pricing_type === "FIXED" ||
        selectedService.pricing_type === "PERCENTAGE") &&
      !currency
    ) {
      toast.error("Please select a currency.");
      return;
    }
    const payload: any = {
      service_id: selectedService.id,
      property_node_ids: selectedUnits,
      status: "ACTIVE",
      is_metered:
        selectedService.pricing_type === "VARIABLE" ? isMetered : false,
    };
    if (
      (selectedService.pricing_type === "FIXED" ||
        selectedService.pricing_type === "PERCENTAGE") &&
      currency
    ) {
      payload.currency = currency;
    }
    if (
      (selectedService.pricing_type === "FIXED" ||
        selectedService.pricing_type === "PERCENTAGE") &&
      amount
    ) {
      payload.custom_price = amount;
    } else {
      payload.custom_price = null;
    }
    mutation.mutate(payload);
  };

      return (
      <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Blocks Dropdown */}
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Selected Blocks:</span>
            <span className="text-sm text-muted-foreground">
              {getSelectedBlocksCount()} of {totalBlocks}
            </span>
          </div>

          <DropdownMenu
            open={blocksDropdownOpen}
            onOpenChange={setBlocksDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between w-full h-12">
                <span>
                  {getSelectedBlocksCount() === 0
                    ? "Select blocks"
                    : `${getSelectedBlocksCount()} block${
                        getSelectedBlocksCount() !== 1 ? "s" : ""
                      } selected`}
                </span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              {blocksWithUnits.map((block: any) => {
                const blockUnits = getUnitsFromBlock(block);
                const blockFloors = getFloorsFromBlock(block);
                return (
                  <DropdownMenuCheckboxItem
                    key={block.id}
                    checked={selectedBlocks.includes(block.id)}
                    onCheckedChange={() => handleBlockToggle(block.id)}
                    className="[&>span:first-child]:hidden px-4 py-3"
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{block.name}</span>
                        <div className="flex gap-4 items-center mt-1">
                          <span className="text-xs text-muted-foreground">
                            {blockFloors.length} floor
                            {blockFloors.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {blockUnits.length} unit
                            {blockUnits.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                          selectedBlocks.includes(block.id)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedBlocks.includes(block.id) && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Units Dropdown */}
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Selected Units:</span>
            <span className="text-sm text-muted-foreground">
              {getSelectedUnitsCount()} of {totalAvailableUnits}
            </span>
          </div>

          <DropdownMenu
            open={unitsDropdownOpen}
            onOpenChange={setUnitsDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="justify-between w-full h-12"
                disabled={selectedBlocks.length === 0}
              >
                <span>
                  {selectedBlocks.length === 0
                    ? "Select blocks first"
                    : getSelectedUnitsCount() === 0
                    ? "Select units"
                    : `${getSelectedUnitsCount()} unit${
                        getSelectedUnitsCount() !== 1 ? "s" : ""
                      } selected`}
                </span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              {selectedBlocks.length === 0 ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  Please select blocks first
                </div>
              ) : (
                blocksWithUnits
                  .filter((block: any) => selectedBlocks.includes(block.id))
                  .map((block: any) => {
                    const blockUnits = getUnitsFromBlock(block);
                    const selectedBlockUnits = blockUnits.filter((unit: any) =>
                      selectedUnits.includes(unit.id)
                    );
                    const allBlockUnitsSelected =
                      blockUnits.length > 0 &&
                      selectedBlockUnits.length === blockUnits.length;

                    return (
                      <div key={block.id}>
                        <DropdownMenuLabel className="py-2 text-base font-semibold">
                          <div className="flex justify-between items-center">
                            <span>{block.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {blockUnits.length} units
                            </span>
                          </div>
                        </DropdownMenuLabel>

                        {/* Select All Units for this Block */}
                        <DropdownMenuCheckboxItem
                          checked={allBlockUnitsSelected}
                          onCheckedChange={() => {
                            const blockUnitIds = blockUnits.map(
                              (unit: any) => unit.id
                            );
                            if (allBlockUnitsSelected) {
                              // Deselect all units in this block
                              setSelectedUnits(
                                selectedUnits.filter(
                                  (id: any) => !blockUnitIds.includes(id)
                                )
                              );
                            } else {
                              // Select all units in this block
                              const newSelectedUnits = [...selectedUnits];
                              blockUnitIds.forEach((id: any) => {
                                if (!newSelectedUnits.includes(id)) {
                                  newSelectedUnits.push(id);
                                }
                              });
                              setSelectedUnits(newSelectedUnits);
                            }
                          }}
                          className="[&>span:first-child]:hidden px-4 py-2 border-b border-border/50"
                        >
                          <div className="flex justify-between items-center w-full">
                            <div className="flex gap-2 items-center">
                              <span className="font-medium text-primary">
                                Select All Units
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({selectedBlockUnits.length}/{blockUnits.length}
                                )
                              </span>
                            </div>
                            <div
                              className={cn(
                                "flex justify-center items-center w-5 h-5 rounded-full border-2 transition-all duration-200",
                                allBlockUnitsSelected
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground/30"
                              )}
                            >
                              {allBlockUnitsSelected && (
                                <Check className="w-3 h-3 text-primary-foreground" />
                              )}
                            </div>
                          </div>
                        </DropdownMenuCheckboxItem>

                        {blockUnits.map((unit: any) => {
                          // Find the floor this unit belongs to
                          const findFloorForUnit = (
                            node: any
                          ): string | null => {
                            if (node.node_type === "FLOOR") {
                              // Check if this floor contains the unit
                              const hasUnit = node.children?.some(
                                (child: any) =>
                                  child.id === unit.id ||
                                  (child.children && findFloorForUnit(child))
                              );
                              if (hasUnit) return node.name;
                            }
                            if (node.children) {
                              for (const child of node.children) {
                                const floorName = findFloorForUnit(child);
                                if (floorName) return floorName;
                              }
                            }
                            return null;
                          };

                          const floorName = findFloorForUnit(block);

                          return (
                            <DropdownMenuCheckboxItem
                              key={unit.id}
                              checked={selectedUnits.includes(unit.id)}
                              onCheckedChange={() => handleUnitToggle(unit.id)}
                              className="[&>span:first-child]:hidden px-4 py-2"
                            >
                              <div className="flex justify-between items-center w-full">
                                <div className="flex flex-col items-start">
                                  <div className="flex gap-2 items-center">
                                    <span>{unit.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {unit.apartment_details?.identifier ||
                                        "Unit"}
                                    </span>
                                  </div>
                                  {floorName && (
                                    <span className="mt-1 text-xs text-muted-foreground">
                                      {floorName}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                                    selectedUnits.includes(unit.id)
                                      ? "bg-primary border-primary"
                                      : "border-muted-foreground/30"
                                  )}
                                >
                                  {selectedUnits.includes(unit.id) && (
                                    <Check className="w-3 h-3 text-primary-foreground" />
                                  )}
                                </div>
                              </div>
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                        <DropdownMenuSeparator />
                      </div>
                    );
                  })
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-6">
        {selectedUnits.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Please select blocks and units first to assign a service
          </div>
        ) : (
          <AsyncServiceCombobox
            value={selectedServiceId}
            onValueChange={setSelectedServiceId}
            onServiceChange={(service) => {
              setSelectedService(service);
              // Auto-populate amount based on service pricing type
              if (service) {
                if (service.pricing_type === "FIXED" && service.base_price) {
                  setAmount(service.base_price.toString());
                } else if (
                  service.pricing_type === "PERCENTAGE" &&
                  service.percentage_rate
                ) {
                  setAmount(service.percentage_rate.toString());
                } else {
                  setAmount("");
                }
                // Auto-populate currency if available
                if (service.currency) {
                  setCurrency(service.currency);
                }
              }
            }}
            filter="block"
          />
        )}
        {selectedService && (
          <div className="mt-4 space-y-2">
            {(selectedService.pricing_type === "FIXED" ||
              selectedService.pricing_type === "PERCENTAGE") && (
              <div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block mb-1 text-sm font-medium">
                      {selectedService.pricing_type === "FIXED"
                        ? "Base Price Amount"
                        : "Percentage Rate (%)"}
                    </label>
                    <input
                      type="number"
                      className="px-2 py-2 w-full rounded border bg-muted"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={0}
                      disabled
                      {...(selectedService.pricing_type === "PERCENTAGE"
                        ? { max: 100 }
                        : {})}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1 text-sm font-medium">
                      Currency
                    </label>
                    <select
                      className="px-2 py-2 w-full rounded border bg-muted"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled
                    >
                      {isLoadingCurrencies ? (
                        <option>Loading...</option>
                      ) : (
                        currencies.map((cur) => (
                          <option key={cur.id} value={cur.id}>
                            ({cur.symbol}) {cur.name} ({cur.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button
          onClick={handleContinue}
          disabled={
            mutation.isPending || selectedUnits.length === 0 || !selectedService
          }
        >
          {mutation.isPending ? "Assigning..." : "Continue"}
        </Button>
      </div>
    </div>
    </div>
  );
};

const HouseSelectionStep = ({
  onBack,
  onNext,
  selectedHouses,
  setSelectedHouses,
  structureData,
  projectId,
  onClose,
}: {
  onBack: () => void;
  onNext: (houses: string[], selectedService: any) => void;
  selectedHouses: string[];
  setSelectedHouses: (houses: string[]) => void;
  structureData: StructureNode[];
  projectId: string;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [housesDropdownOpen, setHousesDropdownOpen] = useState(false);
  const [serviceQuery, setServiceQuery] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [isMetered, setIsMetered] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      createProjectServiceAssignment(projectId, payload),
    onSuccess: () => {
      toast.success("Service assigned successfully!");
      queryClient.refetchQueries({
        queryKey: ["project-service-overview", projectId],
      });
      onClose();
    },
    onError: (error: any) => {
      if (typeof error?.message === "string") {
        toast.error(error.message);
      } else {
        toast.error("Failed to assign service");
      }
      queryClient.refetchQueries({
        queryKey: ["project-service-overview", projectId],
      });
    },
  });

  const handleHouseToggle = (houseId: string) => {
    setSelectedHouses(
      selectedHouses.includes(houseId)
        ? selectedHouses.filter((id) => id !== houseId)
        : [...selectedHouses, houseId]
    );
  };

  const getSelectedHousesCount = () => selectedHouses.length;
  const { houses } = processStructureData(structureData);
  const totalHouses = houses.length;

  const { data: servicesData, isLoading: isServiceLoading } = useQuery({
    queryKey: ["services", serviceQuery],
    queryFn: () =>
      getServices({
        page: 1,
        pageSize: 5,
        is_active: true,
        ...(serviceQuery && { search: serviceQuery }),
      }),
  });

  const services =
    servicesData &&
    typeof servicesData === "object" &&
    "data" in servicesData &&
    !servicesData.isError &&
    servicesData.data?.results
      ? servicesData.data.results
      : [];

  useEffect(() => {
    if (!selectedService) return;
    if (selectedService.pricing_type === "FIXED") {
      setCurrency(selectedService.currency || "");
      setAmount(selectedService.base_price || "");
    } else if (selectedService.pricing_type === "PERCENTAGE") {
      setAmount(selectedService.percentage_rate || "");
      setCurrency("");
    } else {
      setAmount("");
      setCurrency("");
    }
  }, [selectedService]);

  const { data: currenciesResponse, isLoading: isLoadingCurrencies } = useQuery(
    {
      queryKey: ["currencies"],
      queryFn: getCurrencyDropdown,
    }
  );
  type Currency = { id: string; code: string; name: string; symbol: string };
  const currencies: Currency[] = Array.isArray(
    (currenciesResponse as any)?.data
  )
    ? (currenciesResponse as any).data
    : Array.isArray(currenciesResponse)
    ? currenciesResponse
    : [];

  const handleContinue = () => {
    if (!selectedService) return;
    if (selectedHouses.length === 0) return;
    // For FIXED and PERCENTAGE, currency is required
    if (
      (selectedService.pricing_type === "FIXED" ||
        selectedService.pricing_type === "PERCENTAGE") &&
      !currency
    ) {
      toast.error("Please select a currency.");
      return;
    }
    const payload: any = {
      service_id: selectedService.id,
      property_node_ids: selectedHouses,
      status: "ACTIVE",
      is_metered:
        selectedService.pricing_type === "VARIABLE" ? isMetered : false,
    };
    if (
      (selectedService.pricing_type === "FIXED" ||
        selectedService.pricing_type === "PERCENTAGE") &&
      currency
    ) {
      payload.currency = currency;
    }
    if (
      (selectedService.pricing_type === "FIXED" ||
        selectedService.pricing_type === "PERCENTAGE") &&
      amount
    ) {
      payload.custom_price = amount;
    } else {
      payload.custom_price = null;
    }
    mutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Houses Dropdown */}
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Selected Houses:</span>
            <span className="text-sm text-muted-foreground">
              {getSelectedHousesCount()} of {totalHouses}
            </span>
          </div>

          <DropdownMenu
            open={housesDropdownOpen}
            onOpenChange={setHousesDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between w-full h-12">
                <span>
                  {getSelectedHousesCount() === 0
                    ? "Select houses"
                    : `${getSelectedHousesCount()} house${
                        getSelectedHousesCount() !== 1 ? "s" : ""
                      } selected`}
                </span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              {houses.map((house: any) => {
                const houseUnits = getUnitsFromBlock(house);
                const houseFloors = getFloorsFromBlock(house);
                return (
                  <DropdownMenuCheckboxItem
                    key={house.id}
                    checked={selectedHouses.includes(house.id)}
                    onCheckedChange={() => handleHouseToggle(house.id)}
                    className="[&>span:first-child]:hidden px-4 py-3"
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{house.name}</span>
                        <div className="flex gap-4 items-center mt-1">
                          <span className="text-xs text-muted-foreground">
                            {houseFloors.length} floor
                            {houseFloors.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {houseUnits.length} unit
                            {houseUnits.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                          selectedHouses.includes(house.id)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedHouses.includes(house.id) && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-6">
        <label className="block mb-1 text-sm font-medium">Assign Service</label>
        {selectedHouses.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Please select houses first to assign a service
          </div>
        ) : (
          <AsyncServiceCombobox
            value={selectedServiceId}
            onValueChange={setSelectedServiceId}
            onServiceChange={(service) => {
              setSelectedService(service);
              // Auto-populate amount based on service pricing type
              if (service) {
                if (service.pricing_type === "FIXED" && service.base_price) {
                  setAmount(service.base_price.toString());
                } else if (
                  service.pricing_type === "PERCENTAGE" &&
                  service.percentage_rate
                ) {
                  setAmount(service.percentage_rate.toString());
                } else {
                  setAmount("");
                }
                // Auto-populate currency if available
                if (service.currency) {
                  setCurrency(service.currency);
                }
              }
            }}
            filter="house"
          />
        )}
        {selectedService && (
          <div className="p-2 mt-2 text-xs rounded bg-muted">
            <div>
              <b>Pricing Type:</b> {selectedService.pricing_type}
            </div>
            <div>
              <b>Base Price:</b> {selectedService.base_price}
            </div>
            <div>
              <b>Percentage Rate:</b> {selectedService.percentage_rate}
            </div>
            <div>
              <b>Frequency:</b> {selectedService.frequency}
            </div>
            <div>
              <b>Currency:</b> {selectedService.currency}
            </div>
          </div>
        )}
        {selectedService && (
          <div className="mt-4 space-y-2">
            {(selectedService.pricing_type === "FIXED" ||
              selectedService.pricing_type === "PERCENTAGE") && (
              <div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block mb-1 text-sm font-medium">
                      {selectedService.pricing_type === "FIXED"
                        ? "Base Price Amount"
                        : "Percentage Rate (%)"}
                    </label>
                    <input
                      type="number"
                      className="px-2 py-2 w-full rounded border"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={0}
                      {...(selectedService.pricing_type === "PERCENTAGE"
                        ? { max: 100 }
                        : {})}
                    />
                  </div>
                  <div className="w-32">
                    <label className="block mb-1 text-sm font-medium">
                      Currency
                    </label>
                    <select
                      className="px-2 py-2 w-full rounded border"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={isLoadingCurrencies}
                    >
                      {isLoadingCurrencies ? (
                        <option>Loading...</option>
                      ) : (
                        currencies.map((cur) => (
                          <option key={cur.id} value={cur.id}>
                            ({cur.symbol}) {cur.name} ({cur.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button
          onClick={handleContinue}
          disabled={
            mutation.isPending ||
            selectedHouses.length === 0 ||
            !selectedService
          }
        >
          {mutation.isPending ? "Assigning..." : "Continue"}
        </Button>
      </div>
    </div>
  );
};

const AttachServiceModal = ({
  open,
  onClose,
  projectId,
  blockCount = 0,
  houseCount = 0,
  projectName = "Project",
  projectNodeId, // Add this prop for the LocationNode ID
}: AttachServiceModalProps & {
  projectName?: string;
  projectNodeId?: string;
}) => {
  const [assignTarget, setAssignTarget] = useState<
    "project" | "block" | "house" | null
  >(null);
  const [selectedType, setSelectedType] = useState<PropertyType | null>(null);
  const [currentStep, setCurrentStep] = useState<
    "select-blocks" | "select-houses" | null
  >(null);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedHouses, setSelectedHouses] = useState<string[]>([]);
  const [structureData, setStructureData] = useState<StructureNode[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [isMetered, setIsMetered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Add currency query for project assignment
  const { data: currenciesResponse, isLoading: isLoadingCurrencies } = useQuery(
    {
      queryKey: ["currencies"],
      queryFn: getCurrencyDropdown,
    }
  );

  type Currency = { id: string; code: string; name: string; symbol: string };

  const currencies: Currency[] = Array.isArray(
    (currenciesResponse as any)?.data.data
  )
    ? (currenciesResponse as any).data.data
    : Array.isArray(currenciesResponse)
    ? currenciesResponse
    : [];

  useEffect(() => {
    if (open && projectId) {
      const fetchStructure = async () => {
        setIsLoading(true);
        try {
          const response = await getProjectStructure(projectId);
          if (!response.error && response.data.results) {
            setStructureData(response.data.results);
          }
        } catch (error) {
        } finally {
          setIsLoading(false);
        }
      };
      fetchStructure();
    }
  }, [open, projectId]);

  // Assignment mutation for project
  const mutation = useMutation({
    mutationFn: (payload: any) =>
      createProjectServiceAssignment(projectId, payload),
    onSuccess: () => {
      toast.success("Service assigned successfully!");
      queryClient.refetchQueries({
        queryKey: ["project-service-overview", projectId],
      });
      handleClose();
    },
    onError: (error: any) => {
      if (typeof error?.message === "string") {
        toast.error(error.message);
      } else {
        toast.error("Failed to assign service");
      }
      queryClient.refetchQueries({
        queryKey: ["project-service-overview", projectId],
      });
    },
  });

  const handleProjectAssign = () => {
    if (!selectedService) return;
    if (
      (selectedService.pricing_type === "FIXED" ||
        selectedService.pricing_type === "PERCENTAGE") &&
      !currency
    ) {
      toast.error("Please select a currency.");
      return;
    }
    const payload: any = {
      service_id: selectedService.id,
      property_node_ids: [projectNodeId || projectId],
      status: "ACTIVE",
      is_metered:
        selectedService.pricing_type === "VARIABLE" ? isMetered : false,
    };
    if (
      (selectedService.pricing_type === "FIXED" ||
        selectedService.pricing_type === "PERCENTAGE") &&
      currency
    ) {
      payload.currency = currency;
    }
    if (
      (selectedService.pricing_type === "FIXED" ||
        selectedService.pricing_type === "PERCENTAGE") &&
      amount
    ) {
      payload.custom_price = amount;
    } else {
      payload.custom_price = null;
    }
    mutation.mutate(payload);
  };

  const handleCardClick = (target: "project" | "block" | "house") => {
    setAssignTarget(target);
    if (target === "block") setCurrentStep("select-blocks");
    if (target === "house") setCurrentStep("select-houses");
  };

  const handleBack = () => {
    setAssignTarget(null);
    setCurrentStep(null);
    setSelectedService(null);
    setCurrency("");
    setAmount("");
    setIsMetered(false);
  };

  const handleClose = () => {
    setAssignTarget(null);
    setCurrentStep(null);
    setSelectedType(null);
    setSelectedUnits([]);
    setSelectedHouses([]);
    setSelectedService(null);
    setCurrency("");
    setAmount("");
    setIsMetered(false);
    onClose();
  };

  // Get blocks/houses from structureData
  const { blocks, houses } = processStructureData(structureData);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[calc(100vh-150px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-3 items-center">
            {assignTarget && assignTarget !== "project" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-0 w-8 h-8 hover:bg-transparent"
              >
                ←
              </Button>
            )}
            <span>Assign Service</span>
          </DialogTitle>
        </DialogHeader>
                  {!assignTarget && !currentStep && (
            <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
              <div className="grid grid-cols-1 gap-8 my-8 md:grid-cols-2">
            {/* Project Card */}
            <button
              className="group relative flex flex-col items-center bg-gray-100 p-8 border-none rounded-2xl focus:outline-none min-h-[200px] overflow-hidden"
              onClick={() => handleCardClick("project")}
            >
              <div className="flex justify-center items-center mb-4 w-14 h-14 bg-blue-100 rounded-full">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mb-1 text-lg font-bold text-gray-900">
                Project
              </div>
              <div className="text-sm text-center text-gray-500">
                Assign services to the entire project
              </div>
            </button>
            {/* Block Card */}
            {processStructureData(structureData).blocks.length > 0 && (
              <button
                className="group relative flex flex-col items-center bg-blue-100 p-8 border-none rounded-2xl focus:outline-none min-h-[200px] overflow-hidden"
                onClick={() => handleCardClick("block")}
              >
                <div className="flex justify-center items-center mb-4 w-14 h-14 bg-blue-200 rounded-full">
                  <Building2 className="w-8 h-8 text-blue-700" />
                </div>
                <div className="mb-1 text-lg font-bold text-gray-900">
                  Block
                </div>
                <div className="mb-3 text-sm text-center text-gray-500">
                  Assign services to blocks
                </div>
                <div className="flex flex-col items-center mt-2">
                  <span className="text-base text-blue-700">
                    {processStructureData(structureData).blocks.length}
                  </span>
                  <span className="text-xs tracking-wide text-gray-500 uppercase">
                    Blocks
                  </span>
                </div>
              </button>
            )}
            {/* House Card */}
            {processStructureData(structureData).houses.length > 0 && (
              <button
                className="group relative flex flex-col items-center bg-purple-100 p-8 border-none rounded-2xl focus:outline-none min-h-[200px] overflow-hidden"
                onClick={() => handleCardClick("house")}
              >
                <div className="flex justify-center items-center mb-4 w-14 h-14 bg-purple-200 rounded-full">
                  <Home className="w-8 h-8 text-purple-700" />
                </div>
                <div className="mb-1 text-lg font-bold text-gray-900">
                  House
                </div>
                <div className="mb-3 text-sm text-center text-gray-500">
                  Assign services to houses
                </div>
                <div className="flex flex-col items-center mt-2">
                  <span className="text-base text-purple-700">
                    {processStructureData(structureData).houses.length}
                  </span>
                  <span className="text-xs tracking-wide text-gray-500 uppercase">
                    Houses
                  </span>
                </div>
              </button>
            )}
                      </div>
          </div>
          )}
                    {assignTarget === "project" && (
            <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
              <div className="mt-4 space-y-6">
            <div>
              <label className="block mb-1 text-sm font-medium">Project</label>
              <input
                type="text"
                className="px-2 py-2 w-full rounded border bg-muted text-muted-foreground"
                value={projectName}
                disabled
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Service</label>
              <AsyncServiceCombobox
                value={selectedService?.id || ""}
                onValueChange={(id) =>
                  setSelectedService((prev: any) => ({ ...prev, id }))
                }
                onServiceChange={(service) => {
                  setSelectedService(service);
                  // Auto-populate amount based on service pricing type
                  if (service) {
                    if (
                      service.pricing_type === "FIXED" &&
                      service.base_price
                    ) {
                      setAmount(service.base_price.toString());
                    } else if (
                      service.pricing_type === "PERCENTAGE" &&
                      service.percentage_rate
                    ) {
                      setAmount(service.percentage_rate.toString());
                    } else {
                      setAmount("");
                    }
                    // Auto-populate currency if available
                    if (service.currency) {
                      setCurrency(service.currency);
                    }
                  }
                }}
                filter="project"
              />
            </div>
            {selectedService && (
              <div className="mt-4 space-y-2">
                {(selectedService.pricing_type === "FIXED" ||
                  selectedService.pricing_type === "PERCENTAGE") && (
                  <div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block mb-1 text-sm font-medium">
                          {selectedService.pricing_type === "FIXED"
                            ? "Base Price Amount"
                            : "Percentage Rate (%)"}
                        </label>
                        <input
                          type="number"
                          className="px-2 py-2 w-full rounded border bg-muted"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          min={0}
                          disabled
                          {...(selectedService.pricing_type === "PERCENTAGE"
                            ? { max: 100 }
                            : {})}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block mb-1 text-sm font-medium">
                          Currency
                        </label>
                        <select
                          className="px-2 py-2 w-full rounded border bg-muted"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          disabled
                        >
                          <option value="">Select currency</option>
                          {isLoadingCurrencies ? (
                            <option>Loading...</option>
                          ) : (
                            currencies.map((cur) => (
                              <option key={cur.id} value={cur.id}>
                                ({cur.symbol}) {cur.name} ({cur.code})
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={handleBack}>
                Cancel
              </Button>
              <Button
                onClick={handleProjectAssign}
                disabled={mutation.isPending || !selectedService}
              >
                {mutation.isPending ? "Assigning..." : "Continue"}
              </Button>
            </div>
                      </div>
          </div>
          )}
          {currentStep === "select-blocks" && (
          <BlockSelectionStep
            onBack={handleBack}
            onNext={() => {}}
            selectedUnits={selectedUnits}
            setSelectedUnits={setSelectedUnits}
            structureData={structureData}
            projectId={projectId}
            onClose={handleClose}
          />
        )}
        {currentStep === "select-houses" && (
          <HouseSelectionStep
            onBack={handleBack}
            onNext={() => {}}
            selectedHouses={selectedHouses}
            setSelectedHouses={setSelectedHouses}
            structureData={structureData}
            projectId={projectId}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AttachServiceModal;
