import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { assignTenantToUnit } from '@/actions/clients/tenantDashboard';
import { getProjects } from '@/actions/projects';
import { getProjectStructure } from '@/actions/projects/structure';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TenantUserCombobox } from '@/features/property/tenant-assignment/TenantUserCombobox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';

import type { StructureNode } from "@/features/projects/profile/tabs/Components/schema/projectStructureSchema";
interface AllocateTenantModalProps {
  open: boolean;
  onClose: () => void;
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  onAllocate: (allocation: {
    [key: string]: any;
    tenantId: string;
    projectId: string;
    blockId?: string;
    floorId?: string;
    unitId?: string;
    houseId?: string;
  }) => void;
}

export const AllocateTenantModal: React.FC<AllocateTenantModalProps> = ({
  open,
  onClose,
  tenant,
  onAllocate,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
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
  const [hasAgent, setHasAgent] = useState(false);
  const [commission, setCommission] = useState<string>("");
  const [selectedAgreement, setSelectedAgreement] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      // Build backend payload
      const {
        projectId,
        blockId,
        floorId,
        unitId,
        houseId,
        tenantId,
        contractStart,
        contractEnd,
        rentAmount,
        depositAmount,
        currency,
        agreementId,
        agentId,
        commission,
      } = payload;
      // Determine property_type and node ids
      let property_type: "BLOCK" | "HOUSE" = houseId ? "HOUSE" : "BLOCK";
      const backendPayload: any = {
        property_type,
        tenant_user: tenantId,
        contract_start: contractStart,
        contract_end: contractEnd,
        rent_amount: rentAmount,
        deposit_amount: depositAmount,
        currency,
        agreement_id: agreementId,
      };
      if (property_type === "BLOCK") {
        if (blockId) backendPayload.block = blockId;
        if (floorId) backendPayload.floor = floorId;
        if (unitId) backendPayload.unit = unitId;
      } else if (property_type === "HOUSE") {
        if (houseId) backendPayload.house = houseId;
      }
      if (agentId) backendPayload.agent_user = agentId;
      if (commission) backendPayload.commission = commission;
      return assignTenantToUnit(projectId, backendPayload);
    },
    onSuccess: (data) => {
      if (!data.error) {
        toast.success(data.message || "Tenant allocated successfully");
        setSubmitError(null);
        onClose();
      } else {
        toast.error(data.message || "Failed to allocate tenant");
        setSubmitError(data.message || "Failed to allocate tenant");
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to allocate tenant");
      setSubmitError(error?.message || "Failed to allocate tenant");
    },
  });

  // Fetch projects
  const { data: projects, isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects", "dropdown"],
    queryFn: async () => {
      const data = await getProjects({ is_dropdown: true });
      if (data.error) return [];
      return data.data.results;
    },
    enabled: open,
  });
  const projectsArray: any[] = Array.isArray(projects)
    ? projects
    : projects
    ? [projects]
    : [];

  // Fetch project structure
  const { data: structureData, isLoading: isStructureLoading } = useQuery({
    queryKey: ["project-structure", selectedProjectId],
    queryFn: () => getProjectStructure(selectedProjectId),
    enabled: !!selectedProjectId,
  });
  const structure: StructureNode[] = structureData?.data?.results || [];

  // Fetch contract agreements
  const { data: agreementsData, isLoading: isAgreementsLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { fetchDocuments } = await import("@/actions/documents");
      return fetchDocuments();
    },
    enabled: open,
  });
  const agreements = agreementsData?.data?.results || [];

  // Fetch currencies
  const { data: currenciesResponse, isLoading: isCurrenciesLoading } = useQuery(
    {
      queryKey: ["currencies"],
      queryFn: async () => {
        const { getCurrencyDropdown } = await import("@/actions/projects");
        return getCurrencyDropdown();
      },
      enabled: open,
    }
  );
  let currencies: any[] = [];
  if (Array.isArray(currenciesResponse)) {
    currencies = currenciesResponse;
  } else if (
    currenciesResponse &&
    typeof currenciesResponse === "object" &&
    Array.isArray((currenciesResponse as any).data.data)
  ) {
    currencies = (currenciesResponse as any).data.data;
  }

  // Filter options
  const blockOptions = useMemo(
    () => structure.filter((n: any) => n.node_type === "BLOCK"),
    [structure]
  );
  const houseOptions = useMemo(
    () =>
      structure.filter(
        (n: any) =>
          n.node_type === "HOUSE" &&
          n.villa_detail?.management_mode === "FULL_MANAGEMENT"
      ),
    [structure]
  );
  const floorOptions = useMemo(() => {
    if (!selectedBlock) return [];
    return Array.isArray((selectedBlock as any).children)
      ? ((selectedBlock as any).children as any[]).filter(
          (c: any) => c.node_type === "FLOOR"
        )
      : [];
  }, [selectedBlock]);
  const unitOptions = useMemo(() => {
    if (!selectedFloor) return [];
    return Array.isArray((selectedFloor as any).children)
      ? ((selectedFloor as any).children as any[]).filter(
          (u: any) =>
            u.node_type === "UNIT" &&
            u.apartment_details?.management_mode === "FULL_MANAGEMENT"
        )
      : [];
  }, [selectedFloor]);

  // Assignment form setup
  const assignmentSchema = z
    .object({
      contractStart: z.string().min(1, "Start date is required"),
      contractEnd: z.string().optional(),
      rentAmount: z.string().min(1, "Rent amount is required"),
      depositAmount: z.string().min(1, "Deposit amount is required"),
      agreementId: z.string().min(1, "Contract agreement is required"),
      currency: z.string().min(1, "Currency is required"),
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
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      contractStart: "",
      contractEnd: "",
      rentAmount: "",
      depositAmount: "",
      agreementId: "",
      currency: "",
      agentId: undefined,
      commission: "",
    },
  });
  const rentAmount = watch("rentAmount");
  const agentId = watch("agentId");
  const commissionValue = watch("commission");

  // Reset all on close
  React.useEffect(() => {
    if (!open) {
      setSelectedProjectId("");
      setSelectedBlock(null);
      setSelectedFloor(null);
      setSelectedUnit(null);
      setSelectedHouse(null);
      setHasAgent(false);
      setCommission("");
      setSelectedAgreement("");
      setSelectedCurrency("");
      reset();
    }
  }, [open, reset]);

  // Only allow allocation if all required selections are made
  const canAllocate =
    selectedProjectId &&
    ((selectedBlock && selectedFloor && selectedUnit) || selectedHouse) &&
    !!watch("agreementId") &&
    !!watch("currency") &&
    !!watch("contractStart") &&
    !!watch("rentAmount") &&
    !!watch("depositAmount") &&
    (!hasAgent || (!!watch("agentId") && !!watch("commission")));

  const onSubmit = (data: any) => {
    setSubmitError(null);
    if (!tenant || !selectedProjectId) return;
    mutation.mutate({
      ...data,
      tenantId: tenant.id,
      projectId: selectedProjectId,
      blockId:
        selectedBlock &&
        typeof selectedBlock === "object" &&
        "id" in selectedBlock
          ? selectedBlock.id
          : undefined,
      floorId:
        selectedFloor &&
        typeof selectedFloor === "object" &&
        "id" in selectedFloor
          ? selectedFloor.id
          : undefined,
      unitId:
        selectedUnit && typeof selectedUnit === "object" && "id" in selectedUnit
          ? selectedUnit.id
          : undefined,
      houseId:
        selectedHouse &&
        typeof selectedHouse === "object" &&
        "id" in selectedHouse
          ? selectedHouse.id
          : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="w-10/12 md:w-8/12 !max-w-none">
        <DialogHeader>
          <DialogTitle>Allocate Tenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Top: Project, Block, Floor, Unit, House selection */}
          <div className="gap-4 grid grid-cols-1 md:grid-cols-5 py-4">
            <div>
              <label className="block mb-1 font-medium">Project</label>
              <Select
                value={selectedProjectId}
                onValueChange={(value) => {
                  setSelectedProjectId(value);
                  setSelectedBlock(null);
                  setSelectedFloor(null);
                  setSelectedUnit(null);
                  setSelectedHouse(null);
                }}
                disabled={isProjectsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isProjectsLoading
                        ? "Loading projects..."
                        : "Select project"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projectsArray.map((project: any) => (
                    <SelectItem
                      key={(project as any).id}
                      value={(project as any).id}
                    >
                      {(project as any).node.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              {blockOptions.length > 0 && (
                <>
                  <label className="block mb-1 font-medium">Block</label>
                  <Select
                    value={(selectedBlock as any)?.id || ""}
                    onValueChange={(id) => {
                      const block = blockOptions.find(
                        (b) => (b as any).id === id
                      );
                      setSelectedBlock(block || null);
                      setSelectedFloor(null);
                      setSelectedUnit(null);
                    }}
                    disabled={!selectedProjectId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select block" />
                    </SelectTrigger>
                    <SelectContent>
                      {blockOptions.map((block: any) => (
                        <SelectItem
                          key={(block as any).id}
                          value={(block as any).id}
                        >
                          {(block as any).name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
            <div>
              {floorOptions.length > 0 && (
                <>
                  <label className="block mb-1 font-medium">Floor</label>
                  <Select
                    value={(selectedFloor as any)?.id || ""}
                    onValueChange={(id) => {
                      const floor = floorOptions.find(
                        (f) => (f as any).id === id
                      );
                      setSelectedFloor(floor || null);
                      setSelectedUnit(null);
                    }}
                    disabled={!selectedBlock}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                    <SelectContent>
                      {floorOptions.map((floor: any) => (
                        <SelectItem
                          key={(floor as any).id}
                          value={(floor as any).id}
                        >
                          {(floor as any).name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
            <div>
              {unitOptions.length > 0 && (
                <>
                  <label className="block mb-1 font-medium">Unit</label>
                  <Select
                    value={(selectedUnit as any)?.id || ""}
                    onValueChange={(id) => {
                      const unit = unitOptions.find(
                        (u) => (u as any).id === id
                      );
                      setSelectedUnit(unit || null);
                      // Autofill rent amount if available
                      if (unit && unit.apartment_details) {
                        const rentalPrice = unit.apartment_details.rental_price;
                        if (
                          typeof rentalPrice === "string" &&
                          rentalPrice !== null &&
                          rentalPrice !== "" &&
                          !isNaN(Number(rentalPrice))
                        ) {
                          setValue("rentAmount", rentalPrice, {
                            shouldValidate: true,
                          });
                        }
                      }
                    }}
                    disabled={!selectedFloor}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((unit: any) => (
                        <SelectItem
                          key={(unit as any).id}
                          value={(unit as any).id}
                        >
                          {(unit as any).name || `Unit ${(unit as any).id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
            <div>
              {houseOptions.length > 0 && (
                <>
                  <label className="block mb-1 font-medium">House</label>
                  <Select
                    value={(selectedHouse as any)?.id || ""}
                    onValueChange={(id) => {
                      const house = houseOptions.find(
                        (h) => (h as any).id === id
                      );
                      setSelectedHouse(house || null);
                    }}
                    disabled={!selectedProjectId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select house" />
                    </SelectTrigger>
                    <SelectContent>
                      {houseOptions.map((house: any) => (
                        <SelectItem
                          key={(house as any).id}
                          value={(house as any).id}
                        >
                          {(house as any).name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
          {/* Middle: Contract, Rent, Deposit, Currency */}
          <div className="gap-6 grid grid-cols-1 md:grid-cols-3 py-4">
            <div>
              <label className="block mb-1 font-medium">Contract Start</label>
              <Input type="date" {...register("contractStart")} />
              {errors.contractStart && (
                <span className="text-red-500 text-xs">
                  {errors.contractStart.message as string}
                </span>
              )}
            </div>
            <div>
              <label className="block mb-1 font-medium">
                Contract End (optional)
              </label>
              <Input type="date" {...register("contractEnd")} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Rent Amount</label>
              <Input type="number" {...register("rentAmount")} />
              {errors.rentAmount && (
                <span className="text-red-500 text-xs">
                  {errors.rentAmount.message as string}
                </span>
              )}
            </div>
            <div>
              <label className="block mb-1 font-medium">Deposit Amount</label>
              <Input type="number" {...register("depositAmount")} />
              {errors.depositAmount && (
                <span className="text-red-500 text-xs">
                  {errors.depositAmount.message as string}
                </span>
              )}
            </div>
            <div>
              <label className="block mb-1 font-medium">Currency</label>
              <Select
                value={watch("currency")}
                onValueChange={(value) =>
                  setValue("currency", value, { shouldValidate: true })
                }
                disabled={isCurrenciesLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isCurrenciesLoading
                        ? "Loading currencies..."
                        : "Select currency"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency: any) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.name} ({currency.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.currency && (
                <span className="text-red-500 text-xs">
                  {errors.currency.message as string}
                </span>
              )}
            </div>
            <div>
              <label className="block mb-1 font-medium">
                Contract Agreement
              </label>
              <Select
                value={watch("agreementId")}
                onValueChange={(value) =>
                  setValue("agreementId", value, { shouldValidate: true })
                }
                disabled={isAgreementsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isAgreementsLoading
                        ? "Loading agreements..."
                        : "Select agreement"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {agreements.map((agreement: any) => (
                    <SelectItem key={agreement.id} value={agreement.id}>
                      {agreement.template_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.agreementId && (
                <span className="text-red-500 text-xs">
                  {errors.agreementId.message as string}
                </span>
              )}
            </div>
          </div>
          {/* Below: Agent toggle, agent search, commission, calculation */}
          <div className="md:col-span-3 mt-2 pt-4 border-t">
            <div className="flex md:flex-row flex-col md:items-end gap-4 w-full">
              {/* Toggle for agent */}
              <div className="flex flex-col min-w-[180px]">
                <label className="block mb-1 font-medium">
                  Do you have an agent?
                </label>
                <Switch checked={hasAgent} onCheckedChange={setHasAgent} />
              </div>
              {/* Agent search and commission input only if hasAgent is true */}
              {hasAgent && (
                <>
                  <div className="flex-1 min-w-0">
                    <label className="block mb-1 font-medium">
                      Agent (optional)
                    </label>
                    <TenantUserCombobox
                      value={agentId || ""}
                      onChange={(id) =>
                        setValue("agentId", id, { shouldValidate: true })
                      }
                      error={errors.agentId?.message as string}
                      type="agent"
                    />
                    {agentId && (
                      <button
                        type="button"
                        className="mt-2 text-red-500 text-xs underline"
                        onClick={() => setValue("agentId", undefined)}
                      >
                        Remove agent
                      </button>
                    )}
                    {/* Commission input and calculation always shown if hasAgent is true and rentAmount > 0 */}
                    {Number(rentAmount) > 0 && (
                      <>
                        <div className="mt-4">
                          <label className="block mb-1 font-medium">
                            Agent Commission (First Month)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            aria-label="Agent Commission"
                            {...register("commission")}
                            onChange={(e) => {
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
                              setValue("commission", num.toString(), {
                                shouldValidate: true,
                              });
                            }}
                            required
                            min={0}
                            max={rentAmount || undefined}
                            disabled={!agentId}
                            className={
                              !agentId ? "bg-gray-100 cursor-not-allowed" : ""
                            }
                            placeholder="Enter commission"
                          />
                          {errors.commission && (
                            <span className="text-red-500 text-xs">
                              {errors.commission.message as string}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={!canAllocate || mutation.status === "pending"}
            >
              {mutation.status === "pending" ? "Allocating..." : "Allocate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AllocateTenantModal;
