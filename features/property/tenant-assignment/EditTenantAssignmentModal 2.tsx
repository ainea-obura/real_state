"use client";
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { updateTenantAssignment } from '@/actions/projects/tenantAssignment';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    TenantAssignmentFormSchema, TenantAssignmentFormValues,
} from './TenantAssignmentFormSchema';
import { TenantAssignment, TenantUser, UnitDetail } from './types';

interface EditTenantAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: TenantAssignment | null;
  units: UnitDetail[];
  tenants: TenantUser[];
}

export const EditTenantAssignmentModal = ({
  open,
  onClose,
  onSuccess,
  assignment,
  units,
  tenants,
}: EditTenantAssignmentModalProps) => {
  const form = useForm<TenantAssignmentFormValues>({
    resolver: zodResolver(TenantAssignmentFormSchema),
    defaultValues: {
      node: assignment?.node_id || "",
      tenant_user: assignment?.tenant_user_id || "",
      contract_start: assignment?.contract_start || "",
      contract_end: assignment?.contract_end || "",
      rent_amount: assignment?.rent_amount || "",
    },
  });

  useEffect(() => {
    if (assignment) {
      form.reset({
        node: assignment.node_id,
        tenant_user: assignment.tenant_user_id,
        contract_start: assignment.contract_start,
        contract_end: assignment.contract_end,
        rent_amount: assignment.rent_amount,
      });
    }
    // eslint-disable-next-line
  }, [assignment]);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: TenantAssignmentFormValues) => {
    if (!assignment) return;
    setLoading(true);
    try {
      await updateTenantAssignment(assignment.id, values);
      toast.success("Tenant assignment updated");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to update assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        aria-label="Edit Tenant Assignment"
        role="dialog"
        tabIndex={0}
      >
        <DialogHeader>
          <DialogTitle>Edit Tenant Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
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
              >
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem
                    key={unit.id}
                    value={unit.node_id}
                    aria-label={unit.node_name}
                  >
                    {unit.node_name} ({unit.identifier})
                  </SelectItem>
                ))}
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
            <Select
              value={form.watch("tenant_user")}
              onValueChange={(val) => form.setValue("tenant_user", val)}
            >
              <SelectTrigger
                id="tenant_user"
                aria-label="Select tenant"
                tabIndex={0}
                role="combobox"
              >
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem
                    key={tenant.id}
                    value={tenant.id}
                    aria-label={tenant.first_name + " " + tenant.last_name}
                  >
                    {tenant.first_name} {tenant.last_name} ({tenant.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.tenant_user && (
              <span className="text-red-500 text-xs">
                {form.formState.errors.tenant_user.message}
              </span>
            )}
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
              onClick={onClose}
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
              {loading ? "Saving..." : "Update Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
