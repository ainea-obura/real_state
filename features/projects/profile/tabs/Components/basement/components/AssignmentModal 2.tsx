import { ArrowRight, Check } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { assignSlotToUnits, fetchSlotAssignments } from '@/actions/projects/basement';
import { getProjectStructure } from '@/actions/projects/structure';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const badgeColors: Record<string, string> = {
  BLOCK: "bg-purple-200 text-purple-700 border-purple-300",
  HOUSE: "bg-green-200 text-green-700 border-green-300",
  VILLA: "bg-orange-200 text-orange-700 border-orange-300",
  UNIT: "bg-pink-200 text-pink-700 border-pink-300",
  BASEMENT: "bg-blue-200 text-blue-700 border-blue-300",
  SLOT: "bg-yellow-200 text-yellow-700 border-yellow-300",
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
  showGoToChildren = false,
  onGoToChildren,
  selectedNode,
}: {
  isSelected: boolean;
  onSelect?: () => void;
  onUnselect?: () => void;
  showGoToChildren?: boolean;
  onGoToChildren?: () => void;
  selectedNode: any;
}) {
  return (
    <div className="flex absolute right-0 -top-4 z-20 gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      {onSelect &&
        onUnselect &&
        (isSelected ? (
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
            <Check className="w-4 h-4 text-red-600" />
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
        ))}
      {showGoToChildren && onGoToChildren && (
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

const steps = ["Select Unit", "Select Slot(s)", "Review & Assign"];

const AssignmentModal = ({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}) => {
  const {
    data: structureData = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project-structure", projectId],
    queryFn: async () => {
      const response = await getProjectStructure(projectId);
      if (response.error) throw new Error("Failed to fetch structure data");
      return response.data.results;
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const queryClient = useQueryClient();
  const assignMutation = useMutation({
    mutationFn: async () => {
      return assignSlotToUnits({
        unit_id: selectedUnit.id,
        slot_ids: selectedSlots.map((s) => s.id),
      });
    },
    onSuccess: (data) => {
      const result = data as any;
      if (result.error) {
        toast.error(result.message || "Failed to assign slots");
        return;
      }
      toast.success(result.message || "Slots assigned successfully");
      queryClient.invalidateQueries({
        queryKey: ["project-structure", projectId],
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign slots");
    },
  });

  const [step, setStep] = useState(1);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [unitPhase, setUnitPhase] = useState(false);
  const [selectedBasement, setSelectedBasement] = useState<any>(null);
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
  const [basementPhase, setBasementPhase] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedBlock(null);
      setSelectedUnit(null);
      setUnitPhase(false);
      setSelectedBasement(null);
      setSelectedSlots([]);
      setBasementPhase(false);
      setErrors({});
    }
  }, [open]);

  // Get all structures (blocks) and units (houses, villas)
  const structures = (structureData as any[])
    .filter((node) => node.node_type === "BLOCK")
    .map((structure) => {
      // For blocks, look for floors with units
      const floorsWithUnits = (structure.children || []).filter(
        (floor: any) =>
          floor.node_type === "FLOOR" &&
          Array.isArray(floor.children) &&
          floor.children.some((c: any) => c.node_type === "UNIT")
      );
      return { ...structure, floorsWithUnits, structureType: "BLOCK" };
    })
    .filter((structure) => structure.floorsWithUnits.length > 0);

  // Get all houses and villas as units
  const housesAndVillas = (structureData as any[])
    .filter((node) => ["HOUSE", "VILLA"].includes(node.node_type))
    .map((unit) => ({ ...unit, structureType: unit.node_type }));

  // Debug: Log available structures
  console.log("Available structures:", {
    blocks: structures.length,
    housesAndVillas: housesAndVillas.length,
    allNodes:
      (structureData as any[])?.map((n: any) => ({
        name: n.name,
        type: n.node_type,
      })) || [],
  });

  // Get all units for a selected structure
  const unitsForStructure = selectedBlock
    ? selectedBlock.structureType === "BLOCK"
      ? selectedBlock.floorsWithUnits.flatMap((floor: any) =>
          (floor.children || []).filter((u: any) => u.node_type === "UNIT")
        )
      : [selectedBlock] // Houses and villas are units themselves
    : [];

  // Get all basements with at least one slot
  const basements = (structureData as any[])
    .filter((node) => node.node_type === "BASEMENT")
    .map((basement) => {
      const slots = (basement.children || []).filter(
        (c: any) => c.node_type === "SLOT"
      );
      return { ...basement, slots };
    })
    .filter((basement) => basement.slots.length > 0);

  // Get all slots for a selected basement
  const slotsForBasement = selectedBasement ? selectedBasement.slots : [];

  // Fetch current slot assignments to know which slots are taken
  const { data: slotAssignments } = useQuery({
    queryKey: ["slot-assignments", projectId],
    queryFn: async () => {
      const res = await fetchSlotAssignments(projectId);
      const result = res as { error?: boolean; message?: string; data?: any[] };
      if (result.error)
        throw new Error(result.message || "Failed to fetch assignments");
      return result.data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Get taken slot IDs
  const takenSlotIds = useMemo(() => {
    if (!slotAssignments) return new Set();
    const takenSlots = new Set<string>();
    slotAssignments.forEach((assignment: any) => {
      assignment.slots.forEach((slot: any) => {
        takenSlots.add(slot.slot_id);
      });
    });
    return takenSlots;
  }, [slotAssignments]);

  function validateStep(s: number) {
    const newErrors: { [key: string]: string } = {};
    if (s === 1 && !selectedUnit) newErrors.unit = "Please select a unit.";
    if (s === 2 && selectedSlots.length === 0)
      newErrors.slot = "Please select at least one slot.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Determine current step based on manual step management
  const currentStep = step;

  // Debug: Log current state
  console.log("Current state:", {
    selectedBlock,
    selectedUnit,
    unitPhase,
    currentStep,
    hasSelectedUnit: !!selectedUnit,
  });

  function handleNext() {
    if (validateStep(currentStep)) {
      setStep((s) => s + 1);
    }
  }
  function handleBack() {
    setStep((s) => s - 1);
    if (currentStep === 2) {
      setSelectedSlots([]);
    }
  }

  function handleAssign() {
    assignMutation.mutate();
  }

  // Stepper UI
  function Stepper({ steps, current }: { steps: string[]; current: number }) {
    return (
      <div className="flex gap-4 justify-center items-center mb-6 w-full">
        {steps.map((label, idx) => {
          const isActive = current === idx + 1;
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
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-full md:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Assign Slots to Unit</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <Stepper steps={steps} current={currentStep} />
          {isLoading ? (
          <div className="py-8 text-center text-gray-400">
            Loading structure…
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">
            Error loading data.
          </div>
        ) : (
          <>
            {/* Step 1: Block → Unit */}
            {currentStep === 1 && (
              <div>
                {!unitPhase ? (
                  <>
                    <h3 className="mb-2 font-semibold">
                      Select Structure or Unit
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {/* Blocks */}
                      {structures.map((structure) => (
                        <li
                          key={structure.id}
                          className={`relative list-none group`}
                        >
                          <NodeActionIcons
                            isSelected={false}
                            showGoToChildren={true}
                            onGoToChildren={() => {
                              setSelectedBlock(structure);
                              setUnitPhase(true);
                            }}
                            selectedNode={null}
                          />
                          <div
                            className={`flex gap-2 justify-between items-center px-3 py-2 rounded-md border border-gray-200 transition-colors hover:bg-blue-50`}
                          >
                            <div className="flex items-center min-w-0">
                              <NodeBadge type={structure.structureType} />
                              <span className="font-medium text-gray-900">
                                {structure.name}
                              </span>
                            </div>
                            <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">
                              Units:{" "}
                              {
                                structure.floorsWithUnits.flatMap(
                                  (floor: any) =>
                                    (floor.children || []).filter(
                                      (u: any) => u.node_type === "UNIT"
                                    )
                                ).length
                              }
                            </span>
                          </div>
                        </li>
                      ))}

                      {/* Houses and Villas as direct units */}
                      {housesAndVillas.map((unit) => {
                        const isSelected = selectedUnit?.id === unit.id;
                        return (
                          <li
                            key={unit.id}
                            className={`relative list-none group`}
                          >
                            <NodeActionIcons
                              isSelected={isSelected}
                              onSelect={() => {
                                setSelectedBlock(unit);
                                setSelectedUnit(unit);
                                setUnitPhase(false);
                              }}
                              onUnselect={() => {
                                setSelectedBlock(null);
                                setSelectedUnit(null);
                              }}
                              selectedNode={isSelected ? unit : null}
                            />
                            <div
                              className={`flex gap-2 justify-between items-center px-3 py-2 rounded-md border transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-green-100 border-green-500"
                                  : "border-gray-200 hover:bg-blue-50"
                              }`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedBlock(null);
                                  setSelectedUnit(null);
                                } else {
                                  setSelectedBlock(unit);
                                  setSelectedUnit(unit);
                                  setUnitPhase(false);
                                }
                              }}
                            >
                              <div className="flex items-center min-w-0">
                                <NodeBadge type={unit.structureType} />
                                <span className="font-medium text-gray-900">
                                  {unit.name}
                                </span>
                              </div>
                              <span className="ml-2 text-xs text-gray-500 whitespace-nowrap">
                                Direct Unit
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </div>

                    {/* Next button for house selection */}
                    {housesAndVillas.length > 0 && (
                      <div className="flex flex-col gap-2 justify-end mt-6 sm:flex-row">
                        <Button
                          onClick={handleNext}
                          disabled={!selectedUnit}
                          className="px-6"
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="mb-2 font-semibold">Select Unit</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {unitsForStructure.map((unit: any, idx: number) => {
                        const isSelected = selectedUnit?.id === unit.id;
                        let colSpan = "col-span-1";
                        if (unitsForStructure.length === 1)
                          colSpan = "col-span-1 sm:col-span-2 lg:col-span-4";
                        else if (unitsForStructure.length === 2)
                          colSpan = "col-span-1 sm:col-span-2";
                        else if (unitsForStructure.length === 3)
                          colSpan = idx === 2 ? "col-span-1 sm:col-span-2" : "col-span-1";
                        // else 4+ units: col-span-1
                        return (
                          <li
                            key={unit.id}
                            className={`relative list-none group ${colSpan}`}
                          >
                            <NodeActionIcons
                              isSelected={isSelected}
                              onSelect={() => setSelectedUnit(unit)}
                              onUnselect={() => setSelectedUnit(null)}
                              selectedNode={isSelected ? unit : null}
                            />
                            <div
                              className={`flex items-center gap-2 py-2 px-3 rounded-md hover:bg-blue-50 border transition-colors ${
                                isSelected
                                  ? "bg-green-100 border-green-500"
                                  : "border-gray-200"
                              } ${
                                selectedUnit && !isSelected
                                  ? "pointer-events-auto"
                                  : ""
                              }`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedUnit(null);
                                } else {
                                  setSelectedUnit(unit);
                                }
                              }}
                            >
                              <NodeBadge type="UNIT" />
                              <span className="font-medium text-gray-900">
                                {unit.name}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </div>
                    <div className="flex flex-col gap-2 justify-end mt-6 sm:flex-row">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setUnitPhase(false);
                          setSelectedBlock(null);
                          setSelectedUnit(null);
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleNext}
                        disabled={!selectedUnit}
                        className="px-6"
                      >
                        Next
                      </Button>
                    </div>
                    {errors.unit && (
                      <p className="mt-2 text-xs text-red-500">{errors.unit}</p>
                    )}
                  </>
                )}
              </div>
            )}
            {/* Step 2: Basement → Slot(s) */}
            {currentStep === 2 && (
              <div>
                {!basementPhase ? (
                  <>
                    <h3 className="mb-2 font-semibold">Select Parking</h3>
                    {basements.length === 0 ? (
                      <div className="flex flex-col justify-center items-center py-12 text-center">
                        <div className="flex justify-center items-center mb-4 w-16 h-16 bg-gray-100 rounded-full">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">
                          No Parking Area Found
                        </h3>
                        <p className="max-w-md text-sm text-gray-600">
                          No parking areas have been registered for this project
                          yet. Please Register Parking Area on the Strcutre Tab
                          tab.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {basements.map((basement) => (
                          <li
                            key={basement.id}
                            className={`relative list-none group`}
                          >
                            <NodeActionIcons
                              isSelected={false}
                              showGoToChildren={true}
                              onGoToChildren={() => {
                                setSelectedBasement(basement);
                                setBasementPhase(true);
                              }}
                              selectedNode={null}
                            />
                            <div
                              className={`flex gap-2 items-center px-3 py-2 rounded-md border border-gray-200 transition-colors hover:bg-blue-50`}
                            >
                              <NodeBadge type="BASEMENT" />
                              <span className="font-medium text-gray-900">
                                {basement.name}
                              </span>
                            </div>
                          </li>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-6">
                      {/* Header */}
                      <div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">
                          Select Parking Slots
                        </h3>
                        <p className="text-sm text-gray-600">
                          Choose available slots to assign to this unit
                        </p>
                      </div>

                      {/* Slot Statistics */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-gray-900">
                              {slotsForBasement.length}
                            </div>
                            <div className="text-xs font-medium tracking-wide text-gray-600 uppercase">
                              Total Slots
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-red-600">
                              {takenSlotIds.size}
                            </div>
                            <div className="text-xs font-medium tracking-wide text-red-600 uppercase">
                              Taken
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-green-600">
                              {slotsForBasement.length - takenSlotIds.size}
                            </div>
                            <div className="text-xs font-medium tracking-wide text-green-600 uppercase">
                              Available
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Slot Grid */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">
                          Available Slots
                        </h4>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          {slotsForBasement.map((slot: any, idx: number) => {
                            const isSelected = selectedSlots.some(
                              (s) => s.id === slot.id
                            );
                            const isTaken = takenSlotIds.has(slot.id);

                            return (
                              <div
                                key={slot.id}
                                className={`relative group transition-all duration-200 ${
                                  isTaken ? "opacity-60" : ""}`}
                              >
                                {!isTaken && (
                                  <NodeActionIcons
                                    isSelected={isSelected}
                                    onSelect={() =>
                                      setSelectedSlots((prev) => [
                                        ...prev,
                                        slot,
                                      ])
                                    }
                                    onUnselect={() =>
                                      setSelectedSlots((prev) =>
                                        prev.filter((s) => s.id !== slot.id)
                                      )
                                    }
                                    selectedNode={isSelected ? slot : null}
                                  />
                                )}

                                <div
                                  className={`relative h-20 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center ${
                                    isTaken
                                      ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                                      : isSelected
                                      ? "bg-green-50 border-green-500 shadow-lg cursor-pointer shadow-green-100"
                                      : "bg-white border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-md"
                                  }`}
                                  onClick={() => {
                                    if (isTaken) return;
                                    if (isSelected) {
                                      setSelectedSlots((prev) =>
                                        prev.filter((s) => s.id !== slot.id)
                                      );
                                    } else {
                                      setSelectedSlots((prev) => [
                                        ...prev,
                                        slot,
                                      ]);
                                    }
                                  }}
                                >
                                  {/* Slot Badge */}
                                  <div className="mb-2">
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full border border-yellow-200">
                                      SLOT
                                    </span>
                                  </div>

                                  {/* Slot Name */}
                                  <div className="text-center">
                                    <div
                                      className={`font-semibold text-sm ${
                                        isTaken
                                          ? "text-gray-500"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {slot.name}
                                    </div>
                                  </div>

                                  {/* Selection Indicator */}
                                  {isSelected && !isTaken && (
                                    <div className="absolute top-2 right-2">
                                      <div className="flex justify-center items-center w-5 h-5 bg-green-500 rounded-full">
                                        <svg
                                          className="w-3 h-3 text-white"
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
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 justify-end mt-6 sm:flex-row">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setBasementPhase(false);
                          setSelectedBasement(null);
                          setSelectedSlots([]);
                        }}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleNext}
                        disabled={selectedSlots.length === 0}
                        className="px-6"
                      >
                        Next
                      </Button>
                    </div>
                    {errors.slot && (
                      <p className="mt-2 text-xs text-red-500">{errors.slot}</p>
                    )}
                  </>
                )}
              </div>
            )}
            {/* Step 3: Review & Assign */}
            {currentStep === 3 && (
              <div>
                <div className="flex flex-col gap-6 mb-4 lg:flex-row">
                  <div className="flex-1">
                    <div className="mb-2 font-semibold">Unit to Assign</div>
                    {selectedUnit ? (
                      <div>
                        {selectedUnit.name} (Block:{" "}
                        {selectedUnit.node_type === "HOUSE" ||
                        selectedUnit.node_type === "VILLA"
                          ? selectedUnit.name
                          : structures.find((s) =>
                              s.floorsWithUnits.some((floor: any) =>
                                (floor.children || []).some(
                                  (unit: any) => unit.id === selectedUnit.id
                                )
                              )
                            )?.name || "Unknown"}
                        )
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        No unit selected.
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 items-start lg:items-start">
                    <div className="mb-2 font-semibold">Selected Slots</div>
                    {selectedSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedSlots.map((slot) => (
                          <span
                            key={slot.id}
                            className="bg-blue-100 px-2.5 py-0.5 rounded-full font-medium text-blue-800 text-xs"
                          >
                            {slot.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        No slots selected.
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 justify-end mt-6 sm:flex-row">
                  <Button variant="secondary" onClick={handleBack}>
                    Back
                  </Button>
                  <Button
                    onClick={handleAssign}
                    disabled={
                      !selectedUnit ||
                      selectedSlots.length === 0 ||
                      assignMutation.isPending
                    }
                    className="px-6"
                  >
                    {assignMutation.isPending ? "Assigning..." : "Assign"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentModal;
