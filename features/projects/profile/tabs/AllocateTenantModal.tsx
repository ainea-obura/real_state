import { Building2, Home } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { assignTenantToUnit } from '@/actions/clients/tenantDashboard';
import { fetchDocuments } from '@/actions/documents';
import { getCurrencyDropdown } from '@/actions/projects';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TenantUserCombobox } from '@/features/property/tenant-assignment/TenantUserCombobox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';

import type { StructureNode } from "./Components/schema/projectStructureSchema";
import type { Document as ApiDocument } from "@/features/management/documents/schema/documents";
// --- Modal Steps Enum ---
type Step =
  | "chooseType"
  | "chooseBlock"
  | "chooseFloor"
  | "chooseUnit"
  | "chooseHouse"
  | "assignment";

const AllocateTenantModal = ({
  open,
  onClose,
  structure,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  structure: StructureNode[];
  projectId: string;
}) => {
  // --- State ---
  const [step, setStep] = useState<Step>("chooseType");
  const [propertyType, setPropertyType] = useState<"BLOCK" | "HOUSE" | null>(
    null
  );
  const [selectedBlock, setSelectedBlock] = useState<StructureNode | null>(
    null
  );
  const [selectedFloor, setSelectedFloor] = useState<StructureNode | null>(
    null
  );
  const [selectedUnit, setSelectedUnit] = useState<StructureNode | null>(null);
  const [selectedHouse, setSelectedHouse] = useState<StructureNode | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // --- Helpers ---
  const blockOptions = structure.filter((n: any) => n.node_type === "BLOCK");
  // Filter house options to only those with FULL_MANAGEMENT
  const houseOptions = structure.filter(
    (n: any) =>
      n.node_type === "HOUSE" &&
      n.villa_detail?.management_mode === "FULL_MANAGEMENT"
  );
  const hasBlock = blockOptions.length > 0;
  const hasHouse = houseOptions.length > 0;
  // Remove basement from any options/steps
  // If you have a property type selection step, filter out basement

  // --- Step Initialization ---
  React.useEffect(() => {
    if (!open) {
      setStep("chooseType");
      setPropertyType(null);
      setSelectedBlock(null);
      setSelectedFloor(null);
      setSelectedUnit(null);
      setSelectedHouse(null);
      setLoading(true);
      return;
    }
    // If only one type, auto-select and skip type step
    if (open) {
      if (hasBlock && !hasHouse) {
        setPropertyType("BLOCK");
        setStep("chooseBlock");
      } else if (!hasBlock && hasHouse) {
        setPropertyType("HOUSE");
        setStep("chooseHouse");
      } else if (hasBlock && hasHouse) {
        setStep("chooseType");
      }
    }
    setLoading(false);
  }, [open, hasBlock, hasHouse]);

  // --- Stepper Labels ---
  const stepLabels =
    propertyType === "BLOCK"
      ? ["Block", "Floor", "Unit", "Assignment"]
      : propertyType === "HOUSE"
      ? ["House", "Assignment"]
      : [];
  const currentStepIdx = (() => {
    switch (step) {
      case "chooseType":
        return 0;
      case "chooseBlock":
        return 0;
      case "chooseFloor":
        return 1;
      case "chooseUnit":
        return 2;
      case "assignment":
        return propertyType === "BLOCK" ? 3 : 1;
      case "chooseHouse":
        return 0;
      default:
        return 0;
    }
  })();

  // --- Step Content ---
  let content: React.ReactNode = null;
  let showContent = !loading;
  if (loading) {
    content = (
      <div className="flex flex-col justify-center items-center py-12">
        <div className="mb-4 w-8 h-8 rounded-full border-4 animate-spin border-primary border-t-transparent" />
        <div className="text-gray-500">Loading structure...</div>
      </div>
    );
  } else if (step === "chooseType") {
    // Card data for each type
    const typeCards = [
      hasBlock && {
        key: "block",
        label: "Block",
        description: "Add a new block to your property",
        icon: <Building2 className="w-7 h-7 text-blue-600" />,
        bg: "from-blue-50 to-white",
        onClick: () => {
          setPropertyType("BLOCK");
          setStep("chooseBlock");
        },
      },
      hasHouse && {
        key: "house",
        label: "House",
        description: "Create a new house",
        icon: <Home className="w-7 h-7 text-purple-600" />,
        bg: "from-purple-50 to-white",
        onClick: () => {
          setPropertyType("HOUSE");
          setStep("chooseHouse");
        },
      },
    ].filter(Boolean) as Array<{
      key: string;
      label: string;
      description: string;
      icon: React.ReactNode;
      bg: string;
      onClick: () => void;
    }>;

    content = (
      <>
        <div className="mb-2 text-base text-gray-700">
          Choose the type of structure you want to add to your property.
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {typeCards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={`group relative flex flex-col items-start p-6 min-h-[140px] rounded-2xl bg-gradient-to-br ${
                card.bg
              } border-2 ${
                card.key === "block"
                  ? "border-blue-200/40"
                  : card.key === "house"
                  ? "border-purple-200/40"
                  : "border-gray-200/40"
              } transition-transform focus:outline-none focus:ring-2 focus:ring-primary/40 hover:scale-[1.03]`}
              tabIndex={0}
              role="button"
              aria-label={card.label}
              onClick={card.onClick}
              onKeyDown={(e) => {
                if (e.key === "Enter") card.onClick();
              }}
            >
              <div className="flex justify-center items-center mb-4 w-12 h-12 bg-white rounded-xl">
                {card.icon}
              </div>
              <div className="mb-1 text-lg font-bold text-gray-900">
                {card.label}
              </div>
              <div className="text-sm text-left text-gray-500">
                {card.description}
              </div>
            </button>
          ))}
        </div>
      </>
    );
  } else if (step === "chooseBlock" && propertyType === "BLOCK") {
    // List all blocks with stats (floors, units)
    // Only show blocks that have at least one FULL_MANAGEMENT unit in any floor
    const blocksWithUnits = blockOptions.filter((blockNode: StructureNode) => {
      const children = Array.isArray(blockNode.children)
        ? (blockNode.children as StructureNode[])
        : [];
      // Find all floors
      const floors = children.filter((c: StructureNode) => c.node_type === "FLOOR");
      // For each floor, count units with FULL_MANAGEMENT
      const hasUnits = floors.some((floor: StructureNode) => {
        const units = Array.isArray(floor.children)
          ? (floor.children as StructureNode[]).filter(
              (u) =>
                u.node_type === "UNIT" &&
                u.apartment_details?.management_mode === "FULL_MANAGEMENT"
            ).length
          : 0;
        return units > 0;
      });
      return hasUnits;
    });
    content = (
      <ul className="divide-y divide-gray-100">
        {blocksWithUnits.map((blockNode: StructureNode) => {
          const children = Array.isArray(blockNode.children)
            ? (blockNode.children as StructureNode[])
            : [];
          const floors = children.filter((c: StructureNode) => c.node_type === "FLOOR");
          // Count floors with at least one FULL_MANAGEMENT unit
          const fullManagementFloors = floors.filter((floor: StructureNode) => {
            const units = Array.isArray(floor.children)
              ? (floor.children as StructureNode[]).filter(
                  (u) =>
                    u.node_type === "UNIT" &&
                    u.apartment_details?.management_mode === "FULL_MANAGEMENT"
                ).length
              : 0;
            return units > 0;
          }).length;
          // Count all FULL_MANAGEMENT units in all floors
          const units = floors.reduce((acc, floor: StructureNode) => {
            const count = Array.isArray(floor.children)
              ? (floor.children as StructureNode[]).filter(
                  (u) =>
                    u.node_type === "UNIT" &&
                    u.apartment_details?.management_mode === "FULL_MANAGEMENT"
                ).length
              : 0;
            return acc + count;
          }, 0);
          return (
            <li key={blockNode.id}>
              <button
                className="flex justify-between items-center px-2 py-4 w-full text-left rounded transition-colors hover:bg-blue-50 focus:bg-blue-100"
                onClick={() => {
                  setSelectedBlock(blockNode);
                  setStep("chooseFloor");
                }}
                tabIndex={0}
                role="button"
                aria-label={`Select block ${blockNode.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSelectedBlock(blockNode);
                    setStep("chooseFloor");
                  }
                }}
              >
                <span className="font-medium text-gray-900">
                  {blockNode.name}
                </span>
                <span className="ml-4 text-sm text-gray-500">
                  {fullManagementFloors} floors, {units} units
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  } else if (step === "chooseFloor" && selectedBlock) {
    // List all floors in the selected block with stats (units)
    const floors = Array.isArray((selectedBlock as StructureNode)?.children)
      ? ((selectedBlock as StructureNode).children as StructureNode[]).filter((c) => c.node_type === "FLOOR")
      : [];
    // Filter out floors with no FULL_MANAGEMENT units
    const floorsWithUnits = floors.filter((node) => {
      const units = Array.isArray(node.children)
        ? (node.children as StructureNode[]).filter(
            (u) =>
              u.node_type === "UNIT" &&
              u.apartment_details?.management_mode === "FULL_MANAGEMENT"
          ).length
        : 0;
      return units > 0;
    });
    content = (
      <ul className="divide-y divide-gray-100">
        {(floorsWithUnits as StructureNode[]).map((node, idx) => {
          const units = Array.isArray(node.children)
            ? (node.children as StructureNode[]).filter(
                (u) =>
                  u.node_type === "UNIT" &&
                  u.apartment_details?.management_mode === "FULL_MANAGEMENT"
              ).length
            : 0;
          return (
            <li key={node.id}>
              <button
                className="flex justify-between items-center px-2 py-4 w-full text-left rounded transition-colors hover:bg-purple-50 focus:bg-purple-100"
                onClick={() => {
                  setSelectedFloor(node);
                  setStep("chooseUnit");
                }}
                tabIndex={0}
                role="button"
                aria-label={`Select floor ${node.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSelectedFloor(node);
                    setStep("chooseUnit");
                  }
                }}
              >
                <span className="font-medium text-gray-900">{node.name}</span>
                <span className="ml-4 text-sm text-gray-500">
                  {units} units
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  } else if (step === "chooseUnit" && selectedFloor) {
    // List all units in the selected floor, only those with FULL_MANAGEMENT
    const units = Array.isArray((selectedFloor as StructureNode)?.children)
      ? ((selectedFloor as StructureNode).children as StructureNode[]).filter(
          (u) =>
            u.node_type === "UNIT" &&
            u.apartment_details?.management_mode === "FULL_MANAGEMENT"
        )
      : [];
    // Determine col-span for each unit based on the number of units
    const getColSpan = (idx: number, total: number) => {
      if (total === 1) return "col-span-4";
      if (total === 2) return "col-span-2";
      if (total === 3) return idx === 2 ? "col-span-2" : "col-span-1";
      return "col-span-1"; // for 4 or more
    };
    content = (
      <div className="grid grid-cols-4 gap-4">
        {(units as StructureNode[]).map((node: StructureNode, idx: number) => (
          <div key={node.id} className={getColSpan(idx, units.length)}>
            <button
              className="flex justify-between items-center px-2 py-4 w-full text-left rounded transition-colors hover:bg-blue-50 focus:bg-blue-100"
              onClick={() => {
                setSelectedUnit(node);
                setStep("assignment");
              }}
              tabIndex={0}
              role="button"
              aria-label={`Select unit ${node.name || node.id}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSelectedUnit(node);
                  setStep("assignment");
                }
              }}
            >
              <span className="font-medium text-gray-900">
                {node.name || `Unit ${node.id}`}
              </span>
              {/* ID label removed as requested */}
            </button>
          </div>
        ))}
      </div>
    );
  } else if (step === "chooseHouse" && propertyType === "HOUSE") {
    // List all houses with stats (units)
    content = (
      <ul className="divide-y divide-gray-100">
        {(houseOptions as StructureNode[]).map((house) => {
          const units = Array.isArray(house.children)
            ? (house.children as StructureNode[]).filter(
                (c) => c.node_type === "UNIT"
              ).length
            : 0;
          return (
            <li key={house.id}>
              <button
                className="flex justify-between items-center px-2 py-4 w-full text-left rounded transition-colors hover:bg-purple-50 focus:bg-purple-100"
                onClick={() => {
                  setSelectedHouse(house);
                  setStep("assignment");
                }}
                tabIndex={0}
                role="button"
                aria-label={`Select house ${house.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSelectedHouse(house);
                    setStep("assignment");
                  }
                }}
              >
                <span className="font-medium text-gray-900">{house.name}</span>
                <span className="ml-4 text-sm text-gray-500">
                  {units} units
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  } else if (step === "assignment") {
    content = (
      <AssignmentForm
        propertyType={propertyType}
        path={[
          {
            id: (selectedBlock as StructureNode)?.id || "",
            title: (selectedBlock as StructureNode)?.name || "",
          },
          {
            id: (selectedFloor as StructureNode)?.id || "",
            title: (selectedFloor as StructureNode)?.name || "",
          },
          {
            id: (selectedUnit as StructureNode)?.id || "",
            title: (selectedUnit as StructureNode)?.name || "",
          },
        ]}
        selectedHouse={selectedHouse as StructureNode | null}
        selectedUnit={selectedUnit as StructureNode | null}
        onClose={onClose}
        projectId={projectId}
      />
    );
  }

  // --- Stepper UI ---
  const renderStepper = () => (
    <div className="flex gap-2 mb-4">
      {stepLabels.map((label, idx) => (
        <div
          key={label}
          className={`flex-1 h-2 rounded-full ${
            idx < currentStepIdx
              ? "bg-primary"
              : idx === currentStepIdx
              ? "bg-primary/60"
              : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );

  // --- Render ---
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!min-w-8/12">
        <DialogHeader>
          <DialogTitle>Allocate Tenant</DialogTitle>
        </DialogHeader>
        {step !== "chooseType" && renderStepper()}
        <div className="py-4 min-h-[180px]">{content}</div>
        <DialogFooter className="flex gap-2 justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (step === "chooseType") return onClose();
              if (step === "chooseBlock") {
                setStep("chooseType");
                setPropertyType(null);
              } else if (step === "chooseHouse") {
                setStep("chooseType");
                setPropertyType(null);
              } else if (step === "chooseFloor") {
                setStep("chooseBlock");
                setSelectedBlock(null);
              } else if (step === "chooseUnit") {
                setStep("chooseFloor");
                setSelectedFloor(null);
              } else if (step === "assignment") {
                if (propertyType === "BLOCK") {
                  setStep("chooseUnit");
                  setSelectedUnit(null);
                } else if (propertyType === "HOUSE") {
                  setStep("chooseHouse");
                  setSelectedHouse(null);
                }
              }
            }}
          >
            Back
          </Button>
          {/* Only show Submit on last step */}
          {step === "assignment" && (
            <Button
              type="submit"
              form="assignment-form"
              className="ml-2"
              disabled={submitting}
            >
              {submitting ? "Assigning..." : "Submit"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- Zod schema for assignment form ---
const assignmentSchema = z
  .object({
    tenantId: z.string().min(1, "Tenant is required"),
    contractStart: z.string().min(1, "Start date is required"),
    contractEnd: z.string().optional(),
    rentAmount: z.string().min(1, "Rent amount is required"),
    depositAmount: z.string().min(1, "Deposit amount is required"),
    currency: z.string().min(1, "Currency is required"),
    agreementId: z.string().min(1, "Contract agreement is required"),
    agentId: z.string().optional(),
    commission: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const hasAgent = !!values.agentId;
    const rent = Number(values.rentAmount || 0);
    const commission = Number(values.commission || 0);
    if (hasAgent && rent > 0) {
      if (!values.commission || values.commission === "") {
        ctx.addIssue({
          path: ["commission"],
          code: z.ZodIssueCode.custom,
          message: "Commission is required",
        });
      } else if (commission > rent) {
        ctx.addIssue({
          path: ["commission"],
          code: z.ZodIssueCode.custom,
          message: "Commission cannot exceed rent amount",
        });
      }
    }
  });

// --- Assignment Form (now with validation and flow summary) ---
const AssignmentForm = ({
  propertyType,
  path,
  selectedHouse,
  selectedUnit,
  onClose,
  projectId,
}: {
  propertyType: "BLOCK" | "HOUSE" | null;
  path: { id: string; title: string }[];
  selectedHouse?: { id: string; name: string } | null;
  selectedUnit?: StructureNode | null;
  onClose: () => void;
  projectId: string;
}) => {
  // Currency type (reuse from addServicesModel or define here)
  interface Currency {
    id: string;
    name: string;
    code: string;
    symbol: string;
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    resetField,
  } = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      tenantId: "",
      contractStart: "",
      contractEnd: "",
      rentAmount: "",
      depositAmount: "",
      currency: "",
      agreementId: "",
      agentId: undefined,
      commission: "",
    },
  });
  const tenantId = watch("tenantId");
  const agentId = watch("agentId");
  const rentAmount = watch("rentAmount");
  const commission = watch("commission");
  const [hasAgent, setHasAgent] = useState<null | boolean>(null);

  // Handler for switch toggle
  const handleAgentSwitch = (checked: boolean) => {
    setHasAgent(checked);
  };

  const { data: documentsData } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
  });

  // Handler to clamp commission to rent amount
  const handleCommissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rent = Number(rentAmount || 0);
    let value = e.target.value;
    if (value === "") {
      setValue("commission", "");
      return;
    }
    let num = Number(value);
    if (num > rent) {
      num = rent;
    }
    setValue("commission", num.toString(), { shouldValidate: true });
  };

  // Fetch currencies using React Query
  const {
    data: currenciesResponse,
    isLoading: isLoadingCurrencies,
    isError: isErrorCurrencies,
  } = useQuery({
    queryKey: ["currencies"],
    queryFn: getCurrencyDropdown,
  });
  const currencies: Currency[] = currenciesResponse?.data.data || [];

  // Handle combobox change
  const handleTenantChange = (id: string) =>
    setValue("tenantId", id, { shouldValidate: true });
  const handleAgentChange = (id: string) =>
    setValue("agentId", id, { shouldValidate: true });

  // If user toggles to 'No agent', clear agentId and commission
  useEffect(() => {
    if (hasAgent === false) {
      setValue("agentId", undefined);
      setValue("commission", "");
    }
  }, [hasAgent, setValue]);

  // If rent is 0, clear commission
  useEffect(() => {
    if (!rentAmount || Number(rentAmount) === 0) {
      setValue("commission", "");
    }
  }, [rentAmount, setValue]);

  // Pre-populate rent amount from selected unit's rental_price
  useEffect(() => {
    if (selectedUnit && selectedUnit.apartment_details?.rental_price) {
      const rentalPrice = selectedUnit.apartment_details.rental_price;
      setValue("rentAmount", rentalPrice.toString(), { shouldValidate: true });
    }
  }, [selectedUnit, setValue]);

  // On submit, collect all data and flow
  const [submitting, setSubmitting] = useState(false);
  const onSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      let nodeMap: Record<string, string> = {};
      if (propertyType === "BLOCK") {
        if (path[0]) nodeMap.block = path[0].id;
        if (path[1]) nodeMap.floor = path[1].id;
        if (path[2]) nodeMap.unit = path[2].id;
      } else if (propertyType === "HOUSE") {
        const houseId = path[0]?.id || selectedHouse?.id || "";
        nodeMap.house = houseId;
      }
      const payload: any = {
        property_type: propertyType,
        ...nodeMap,
        tenant_user: values.tenantId,
        contract_start: values.contractStart,
        contract_end: values.contractEnd,
        rent_amount: values.rentAmount,
        deposit_amount: values.depositAmount,
        currency: values.currency,
        agreement_id: values.agreementId,
      };
      if (hasAgent && values.agentId) {
        payload.agent_user = values.agentId;
        // Always send commission if the input is visible (rent > 0)
        if (Number(values.rentAmount) > 0) {
          payload.commission = values.commission ?? "0";
        }
      }
      const result = await assignTenantToUnit(projectId, payload);
      if (!result.error) {
        toast.success(result.message || "Tenant assigned successfully");
        onClose();
      } else {
        toast.error(result.message || "Failed to assign tenant");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to assign tenant");
    } finally {
      setSubmitting(false);
    }
  };

  // --- UI ---
  return (
    <div className="w-full">
      <div className="px-0 pt-0 pb-2">
        <h2 className="mb-1 text-xl font-bold text-gray-900">
          Tenant Assignment
        </h2>
        <p className="text-sm text-gray-500">
          Fill in the details to allocate a tenant to this unit/house.
        </p>
      </div>
      {/* Flow summary */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs text-gray-500">
        {path.map((p, i) => (
          <span key={`${i}-${p.id}`} className="px-2 py-1 bg-gray-100 rounded">
            {p.title}
          </span>
        ))}
      </div>
      <form
        className="flex flex-col gap-6 p-2 md:p-4"
        id="assignment-form"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Main grid: 3 columns for compactness, fit modal width */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-3">
          {/* Tenant selection */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Tenant
            </label>
            <TenantUserCombobox
              value={tenantId}
              onChange={handleTenantChange}
              error={errors.tenantId?.message as string}
            />
          </div>
          {/* Contract Start */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Contract Start
            </label>
            <Input
              type="date"
              aria-label="Contract Start"
              {...register("contractStart")}
            />
            {errors.contractStart && (
              <span className="text-xs text-red-500">
                {errors.contractStart.message as string}
              </span>
            )}
          </div>
          {/* Contract End */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Contract End (optional)
            </label>
            <Input
              type="date"
              aria-label="Contract End"
              {...register("contractEnd")}
            />
            {errors.contractEnd && (
              <span className="text-xs text-red-500">
                {errors.contractEnd.message as string}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 col-span-3 gap-4 items-center">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Contract Agreement
              </label>
              <Select
                {...register("agreementId")}
                onValueChange={(value) =>
                  setValue("agreementId", value, { shouldValidate: true })
                }
                value={watch("agreementId")}
              >
                <SelectTrigger className="w-full !h-11">
                  <SelectValue placeholder="Select Contract Agreement" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    documentsData?.data?.results as ApiDocument[] | undefined
                  )?.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.template_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.agreementId && (
                <span className="text-xs text-red-500">
                  {errors.agreementId.message as string}
                </span>
              )}
            </div>
            {/* Currency select */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Currency
              </label>
              <Select
                disabled={isLoadingCurrencies || isErrorCurrencies}
                onValueChange={(value) =>
                  setValue("currency", value, { shouldValidate: true })
                }
                defaultValue="USD"
                value={watch("currency")}
              >
                <SelectTrigger className="w-full !h-11">
                  <SelectValue
                    placeholder={
                      isLoadingCurrencies
                        ? "Loading currencies..."
                        : isErrorCurrencies
                        ? "Failed to load currencies"
                        : "Select currency"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!isLoadingCurrencies &&
                  !isErrorCurrencies &&
                  currencies.length > 0
                    ? currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                         {currency.name} ({currency.code})
                        </SelectItem>
                      ))
                    : null}
                </SelectContent>
              </Select>
              {errors.currency && (
                <span className="text-xs text-red-500">
                  {errors.currency.message as string}
                </span>
              )}
            </div>
            {/* Rent amount */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Rent Amount
              </label>
              <Input
                type="number"
                step="0.01"
                aria-label="Rent Amount"
                {...register("rentAmount")}
              />
              {errors.rentAmount && (
                <span className="text-xs text-red-500">
                  {errors.rentAmount.message as string}
                </span>
              )}
            </div>
            {/* Deposit amount */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Deposit Amount
              </label>
              <Input
                type="number"
                step="0.01"
                aria-label="Deposit Amount"
                {...register("depositAmount")}
              />
              {errors.depositAmount && (
                <span className="text-xs text-red-500">
                  {errors.depositAmount.message as string}
                </span>
              )}
            </div>
          </div>
          {/* Agent section - always last row in grid */}
          <div className="pt-4 mt-2 border-t md:col-span-3">
            <div className="flex flex-col gap-4 w-full md:flex-row md:items-end">
              {/* Toggle for agent */}
              <div className="flex flex-col min-w-[180px]">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Do you have an agent?
                </label>
                <Switch
                  checked={!!hasAgent}
                  onCheckedChange={handleAgentSwitch}
                />
              </div>
              {/* Agent search and commission input only if hasAgent is true */}
              {hasAgent && (
                <>
                  <div className="flex-1 min-w-0">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Agent (optional)
                    </label>
                    <TenantUserCombobox
                      value={agentId || ""}
                      onChange={handleAgentChange}
                      error={errors.agentId?.message as string}
                      type="agent"
                    />
                    {agentId && (
                      <button
                        type="button"
                        className="mt-2 text-xs text-red-500 underline"
                        onClick={() => setValue("agentId", undefined)}
                      >
                        Remove agent
                      </button>
                    )}
                  </div>
                  {/* Only show commission input if rentAmount > 0 */}
                  {Number(rentAmount) > 0 && (
                    <div className="flex-1 min-w-0">
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Agent Commission (First Month)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        aria-label="Agent Commission"
                        {...register("commission")}
                        onChange={handleCommissionChange}
                        required
                        disabled={!agentId}
                        min={0}
                        max={rentAmount || undefined}
                        className={
                          !agentId ? "bg-gray-100 cursor-not-allowed" : ""
                        }
                        placeholder="Enter commission"
                      />
                      {errors.commission && (
                        <span className="text-xs text-red-500">
                          {errors.commission.message as string}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {/* First Month Payment (disabled, always last col) */}
          {/* <div className="md:col-span-3">
            <label className="block mb-1 text-sm font-medium text-gray-700">First Month Payment (Tenant Pays)</label>
            <Input
              type="number"
              value={Math.max(Number(rentAmount || 0) - Number(commission || 0), 0)}
              disabled
              className="w-full bg-gray-100 cursor-not-allowed"
            />
          </div> */}
        </div>
      </form>
    </div>
  );
};

export default AllocateTenantModal;
