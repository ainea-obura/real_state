"use client";
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useQuery } from 'react-query';

import { createTenantAssignment } from '@/actions/projects/tenantAssignment';
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
import { TenantUser, UnitDetail } from './types';
import { getProjectStructure } from '@/actions/projects/structure';

interface AddTenantAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddTenantAssignmentModal = ({
  open,
  onClose,
  onSuccess,
}: AddTenantAssignmentModalProps) => {
  const params = useParams();
  const projectId = params?.id as string;
  const {
    data: structureData = [],
    isLoading: isLoadingStructure,
    error: structureError,
    refetch: refetchStructure,
  } = useQuery({
    queryKey: ['project-structure', projectId],
    queryFn: async () => {
      const response = await getProjectStructure(projectId);
      if (response.error) {
        throw new Error('Failed to fetch structure data');
      }
      return response.data.results;
    },
    enabled: open && !!projectId,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  
  const [structureType, setStructureType] = useState<'BLOCK' | 'HOUSE' | ''>('');
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedApartment, setSelectedApartment] = useState<string>('');
  const [tenantOptions, setTenantOptions] = useState<TenantUser[]>([]);
  const form = useForm<TenantAssignmentFormValues>({
    resolver: zodResolver(TenantAssignmentFormSchema),
    defaultValues: {
      node: '',
      tenant_user: '',
      contract_start: '',
      contract_end: '',
      rent_amount: '',
      currency: 'USD',
    },
  });

  const [loading, setLoading] = useState(false);

  // Helper functions to extract blocks, floors, apartments, houses
  const getBlocks = (): any[] => structureData.filter((n: any) => n.node_type === 'BLOCK');
  const getHouses = (): any[] => structureData.filter((n: any) => n.node_type === 'HOUSE');
  const getFloors = (): any[] => {
    const block = getBlocks().find((b: any) => b.id === selectedBlock);
    return block ? block.children.filter((n: any) => n.node_type === 'FLOOR') : [];
  };
  const getApartments = (): any[] => {
    const floor = getFloors().find((f: any) => f.id === selectedFloor);
    return floor ? floor.children.filter((n: any) => n.node_type === 'UNIT') : [];
  };

  // Tenant search handler (calls backend API)
  const handleTenantSearch = async (query: string) => {
    // Call your backend tenant search API here
    // Example: const results = await searchTenants(query);
    // setTenantOptions(results);
  };

  // Build payload for API
  const buildPayload = (values: TenantAssignmentFormValues) => {
    if (structureType === 'BLOCK') {
      return {
        project_id: projectId,
        structure_type: 'BLOCK',
        block: selectedBlock,
        floor: selectedFloor,
        apartment: selectedApartment,
        tenant_user_id: values.tenant_user,
        contract_start: values.contract_start,
        contract_end: values.contract_end,
        rent_amount: values.rent_amount,
        currency: values.currency,
      };
    } else if (structureType === 'HOUSE') {
      // For HOUSE structure, we'll assign to all houses
      const houses = getHouses();
      return {
        project_id: projectId,
        structure_type: 'HOUSE',
        houses: houses.map(house => house.id), // Send all house IDs
        tenant_user_id: values.tenant_user,
        contract_start: values.contract_start,
        contract_end: values.contract_end,
        rent_amount: values.rent_amount,
        currency: values.currency,
      };
    }
    return {};
  };

  const handleSubmit = async (values: TenantAssignmentFormValues) => {
    setLoading(true);
    try {
      const payload = buildPayload(values);
      // The backend expects a dynamic payload (not TenantAssignmentCreateInput)
      await createTenantAssignment(payload as any);
      toast.success("Tenant assigned successfully");
      onSuccess();
      onClose();
      form.reset();
    } catch (e: any) {
      toast.error(e.message || "Failed to assign tenant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        aria-label="Add Tenant Assignment"
        role="dialog"
        tabIndex={0}
      >
        <DialogHeader>
          <DialogTitle>Add Tenant Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => {
          handleSubmit(values);
        })} className="space-y-4">
          {isLoadingStructure ? (
            <div className="flex flex-col justify-center items-center py-12">
              <Loader2 className="mb-4 w-8 h-8 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading structure...</span>
            </div>
          ) : (
            <>
              {/* Step 1: Structure Type */}
              <div>
                <label htmlFor="structure_type" className="block text-sm font-medium">
                  Structure Type
                </label>
                <Select
                  value={structureType}
                  onValueChange={(val) => {
                    setStructureType(val as 'BLOCK' | 'HOUSE');
                    setSelectedBlock('');
                    setSelectedFloor('');
                    setSelectedApartment('');
                  }}
                >
                  <SelectTrigger id="structure_type" aria-label="Select structure type" tabIndex={0} role="combobox">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BLOCK" aria-label="Block">Block</SelectItem>
                    <SelectItem value="HOUSE" aria-label="House">House</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Step 2: Block/Floor/Apartment or House Info */}
              {structureType === 'BLOCK' && (
                <>
                  <div>
                    <label htmlFor="block" className="block text-sm font-medium">Block</label>
                    <Select
                      value={selectedBlock}
                      onValueChange={(val) => {
                        setSelectedBlock(val);
                        setSelectedFloor('');
                        setSelectedApartment('');
                      }}
                    >
                      <SelectTrigger id="block" aria-label="Select block" tabIndex={0} role="combobox">
                        <SelectValue placeholder="Select block" />
                      </SelectTrigger>
                      <SelectContent>
                        {getBlocks().map((block) => (
                          <SelectItem key={block.id} value={block.id} aria-label={block.name}>{block.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="floor" className="block text-sm font-medium">Floor</label>
                    <Select
                      value={selectedFloor}
                      onValueChange={(val) => {
                        setSelectedFloor(val);
                        setSelectedApartment('');
                      }}
                      disabled={!selectedBlock}
                    >
                      <SelectTrigger id="floor" aria-label="Select floor" tabIndex={0} role="combobox">
                        <SelectValue placeholder="Select floor" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFloors().map((floor) => (
                          <SelectItem key={floor.id} value={floor.id} aria-label={floor.name}>{floor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="apartment" className="block text-sm font-medium">Apartment</label>
                    <Select
                      value={selectedApartment}
                      onValueChange={setSelectedApartment}
                      disabled={!selectedFloor}
                    >
                      <SelectTrigger id="apartment" aria-label="Select apartment" tabIndex={0} role="combobox">
                        <SelectValue placeholder="Select apartment" />
                      </SelectTrigger>
                      <SelectContent>
                        {getApartments().map((apt) => (
                          <SelectItem key={apt.id} value={apt.id} aria-label={apt.name}>{apt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {structureType === 'HOUSE' && (
                <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">
                      House Structure Selected
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-blue-600">
                    Tenant will be assigned to all houses in this project ({getHouses().length} houses available)
                  </p>
                </div>
              )}
              {/* Step 3: Tenant Search */}
              <div>
                <label htmlFor="tenant_user" className="block text-sm font-medium">Tenant</label>
                {/* Replace with your TenantUserCombobox, wired to backend search */}
                {/* <TenantUserCombobox ... /> */}
                <Select
                  value={form.watch('tenant_user')}
                  onValueChange={(val) => form.setValue('tenant_user', val)}
                >
                  <SelectTrigger id="tenant_user" aria-label="Select tenant" tabIndex={0} role="combobox">
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantOptions.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id} aria-label={tenant.first_name + ' ' + tenant.last_name}>
                        {tenant.first_name} {tenant.last_name} ({tenant.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.tenant_user && (
                  <span className="text-xs text-red-500">{form.formState.errors.tenant_user.message}</span>
                )}
              </div>
              {/* Step 4: Contract Details */}
              <div>
                <label htmlFor="contract_start" className="block text-sm font-medium">Contract Start</label>
                <Input id="contract_start" type="date" {...form.register('contract_start')} aria-label="Contract start date" tabIndex={0} role="textbox" />
                {form.formState.errors.contract_start && (
                  <span className="text-xs text-red-500">{form.formState.errors.contract_start.message}</span>
                )}
              </div>
              <div>
                <label htmlFor="contract_end" className="block text-sm font-medium">Contract End</label>
                <Input id="contract_end" type="date" {...form.register('contract_end')} aria-label="Contract end date" tabIndex={0} role="textbox" />
                {form.formState.errors.contract_end && (
                  <span className="text-xs text-red-500">{form.formState.errors.contract_end.message}</span>
                )}
              </div>
              <div>
                <label htmlFor="rent_amount" className="block text-sm font-medium">Rent Amount</label>
                <Input id="rent_amount" type="number" step="0.01" {...form.register('rent_amount')} aria-label="Rent amount" tabIndex={0} role="spinbutton" />
                {form.formState.errors.rent_amount && (
                  <span className="text-xs text-red-500">{form.formState.errors.rent_amount.message}</span>
                )}
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium">Currency</label>
                <Select
                  value={form.watch('currency')}
                  onValueChange={(val) => form.setValue('currency', val as string)}
                >
                  <SelectTrigger id="currency" aria-label="Select currency" tabIndex={0} role="combobox">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD" aria-label="USD">USD</SelectItem>
                    <SelectItem value="EUR" aria-label="EUR">EUR</SelectItem>
                    <SelectItem value="KE" aria-label="KE">KE</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.currency && (
                  <span className="text-xs text-red-500">{form.formState.errors.currency.message}</span>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={onClose} tabIndex={0} aria-label="Cancel">Cancel</Button>
                <Button type="submit" disabled={isLoadingStructure || loading} tabIndex={0} aria-label="Submit">{isLoadingStructure || loading ? 'Saving...' : 'Assign Tenant'}</Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
