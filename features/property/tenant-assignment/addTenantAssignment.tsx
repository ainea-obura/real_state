"use client";
import { useAtom } from 'jotai';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { getPropertyStructure, StructureNode } from '@/actions/projects/structure';
import {
    createTenantAssignment, updateTenantAssignment,
} from '@/actions/projects/tenantAssignment';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { isTenantAssignmentModalOpen, selectedTenantAssignmentAtom } from '@/store';
import { zodResolver } from '@hookform/resolvers/zod';

import { TenantAssignment, TenantUser, UnitDetail } from '../tenant-assignment/types';
import {
    TenantAssignmentFormSchema, TenantAssignmentFormValues,
} from './TenantAssignmentFormSchema';
import { TenantUserCombobox } from './TenantUserCombobox';

// Dummy fetchers for units and tenants (replace with real API calls)
const fetchUnits = async (): Promise<UnitDetail[]> => [];
const fetchTenants = async (): Promise<TenantUser[]> => [];

// Extend UnitDetail for local use to include parents
interface UnitWithParents extends UnitDetail {
  parents: StructureNode[];
}

const AddTenantAssignment = () => {
  const [open, setOpen] = useAtom(isTenantAssignmentModalOpen);
  const [selected, setSelected] = useAtom(selectedTenantAssignmentAtom);
  const [units, setUnits] = useState<UnitDetail[]>([]);
  const [tenants, setTenants] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);

  const params = useParams();
  const propertyId = params?.id as string;

  const isEdit = !!selected;

  const form = useForm<TenantAssignmentFormValues>({
    resolver: zodResolver(TenantAssignmentFormSchema),
    defaultValues: {
      node: selected?.node_id || "",
      tenant_user: selected?.tenant_user_id || "",
      contract_start: selected?.contract_start || "",
      contract_end: selected?.contract_end || "",
      rent_amount: selected?.rent_amount || "",
    },
  });

  useEffect(() => {
    fetchTenants().then(setTenants);
  }, []);

  useEffect(() => {
    if (selected) {
      form.reset({
        node: selected.node_id,
        tenant_user: selected.tenant_user_id,
        contract_start: selected.contract_start,
        contract_end: selected.contract_end,
        rent_amount: selected.rent_amount,
      });
    } else {
      form.reset({
        node: "",
        tenant_user: "",
        contract_start: "",
        contract_end: "",
        rent_amount: "",
      });
    }
    // eslint-disable-next-line
  }, [selected]);

  // Fetch units from property structure
  useEffect(() => {
    
    if (!open || !propertyId) return;
    (async () => {
      const res = await getPropertyStructure(propertyId);
      
      if (res.isError || !res.data) {
        setUnits([]);
        return;
      }
      
      function extractUnits(
        nodes: StructureNode[],
        parents: StructureNode[] = []
      ): UnitWithParents[] {
        let units: UnitWithParents[] = [];
        for (const node of nodes) {
          if (
            (node as any).type === "UNIT" ||
            (node as any).node_type === "UNIT"
          ) {
            units.push({ ...(node as any), parents });
          }
          if (node.children?.length) {
            units = units.concat(
              extractUnits(node.children, [...parents, node])
            );
          }
        }
        return units;
      }
      const allUnits = extractUnits(res.data.children);
      setUnits(allUnits);
    })();
  }, [open, propertyId]);

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
    form.reset();
  };

  const handleSubmit = async (values: TenantAssignmentFormValues) => {
    setLoading(true);
    try {
      if (isEdit && selected) {
        await updateTenantAssignment(selected.id, values);
        toast.success("Tenant assignment updated");
      } else {
        await createTenantAssignment(values);
        toast.success("Tenant assigned successfully");
      }
      handleClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to save assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        aria-label={isEdit ? "Edit Tenant Assignment" : "Add Tenant Assignment"}
        role="dialog"
        tabIndex={0}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Tenant Assignment" : "Add Tenant Assignment"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="w-full">
            <label htmlFor="node" className="block font-medium text-sm">
              Unit
            </label>
            <Select
              value={form.watch("node")}
              onValueChange={(val) => form.setValue("node", val)}
            >
              <SelectTrigger
                id="node"
                aria-label="Select unit"
                tabIndex={0}
                role="combobox"
                className="w-full"
              >
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent className="w-full">
                {(units as UnitWithParents[]).map((unit) => {
                  const floor = unit.parents?.find(
                    (p: StructureNode) => p.type === "FLOOR"
                  );
                  const block = unit.parents?.find(
                    (p: StructureNode) => p.type === "BLOCK"
                  );
                  const label =
                    `${
                      (unit as any).name || (unit as any).node_name || "Unit"
                    } (${unit.identifier || "No ID"})` +
                    (floor && typeof (floor as any).number !== "undefined"
                      ? `, Floor ${(floor as any).number}`
                      : "") +
                    (block && ((block as any).name || (block as any).node_name)
                      ? `, Block ${
                          (block as any).name || (block as any).node_name
                        }`
                      : "");
                  return (
                    <SelectItem
                      key={unit.id}
                      value={unit.id}
                      aria-label={
                        (unit as any).name || (unit as any).node_name || "Unit"
                      }
                    >
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {form.formState.errors.node && (
              <span className="text-red-500 text-xs">
                {form.formState.errors.node.message}
              </span>
            )}
          </div>
          <div>
            <label htmlFor="tenant_user" className="block font-medium text-sm">
              Tenant
            </label>
            <TenantUserCombobox
              value={form.watch("tenant_user")}
              onChange={(val) =>
                form.setValue("tenant_user", val, { shouldValidate: true })
              }
              error={form.formState.errors.tenant_user?.message}
            />
          </div>
          <div>
            <label
              htmlFor="contract_start"
              className="block font-medium text-sm"
            >
              Contract Start
            </label>
            <Input
              id="contract_start"
              type="date"
              {...form.register("contract_start")}
              aria-label="Contract start date"
              tabIndex={0}
              role="textbox"
            />
            {form.formState.errors.contract_start && (
              <span className="text-red-500 text-xs">
                {form.formState.errors.contract_start.message}
              </span>
            )}
          </div>
          <div>
            <label htmlFor="contract_end" className="block font-medium text-sm">
              Contract End
            </label>
            <Input
              id="contract_end"
              type="date"
              {...form.register("contract_end")}
              aria-label="Contract end date"
              tabIndex={0}
              role="textbox"
            />
            {form.formState.errors.contract_end && (
              <span className="text-red-500 text-xs">
                {form.formState.errors.contract_end.message}
              </span>
            )}
          </div>
          <div>
            <label htmlFor="rent_amount" className="block font-medium text-sm">
              Rent Amount
            </label>
            <Input
              id="rent_amount"
              type="number"
              step="0.01"
              {...form.register("rent_amount")}
              aria-label="Rent amount"
              tabIndex={0}
              role="spinbutton"
            />
            {form.formState.errors.rent_amount && (
              <span className="text-red-500 text-xs">
                {form.formState.errors.rent_amount.message}
              </span>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              tabIndex={0}
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              tabIndex={0}
              aria-label="Submit"
            >
              {loading
                ? isEdit
                  ? "Saving..."
                  : "Assigning..."
                : isEdit
                ? "Update Assignment"
                : "Assign Tenant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTenantAssignment;
